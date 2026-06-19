# 調査ログ: GitHub Issue RPG

## サマリ

新規グリーンフィールドの複雑機能のため、フル discovery を実施。設計の不確実点だった2領域を調査確定した。

1. **Claude Agent SDK（鍛冶屋のTDD実行＋呪文介入＋スキル/MCP装備）** — 全要件が実現可能と確認。
2. **GitHub auto-merge / PR操作 / CI取得 / テストpassのリアルタイム取得** — 実現可能。ただし auto-merge に既知の回帰リスクがあり、CIポーリング＋通常マージのフォールバックを必須とする。

調査ソースは各公式ドキュメント（code.claude.com / platform.claude.com / docs.github.com / cli.github.com / vitest.dev / jestjs.io）および context7。

---

## Research Log

### トピック1: Claude Agent SDK（`@anthropic-ai/claude-agent-sdk`, TypeScript）

**ソース**: 公式 Agent SDK TS リファレンス（code.claude.com / platform.claude.com）、context7ミラー。

**主要発見**:

| 論点 | 結論 | 実装への含意 |
|---|---|---|
| `query()` API | `query({ prompt, options }): Query`。`Query` は `AsyncGenerator<SDKMessage>` を継承し `for await` で逐次受信。`prompt` は `string`（単発）または `AsyncIterable<SDKUserMessage>`（ストリーミング入力） | 戦闘ループは `for await` でメッセージを受け、変換してWS配信 |
| 呪文の割り込み | **可能**。`prompt` に `async function*` を渡し、await で待機しつつ追加メッセージを `yield`。または `Query.streamInput(stream)`。`interrupt()`/`setPermissionMode()`/`setModel()` はストリーミング入力モードでのみ可。`shouldQuery:false` でターン起動せず追記のみも可 | WSで受けた `cmd.spell` をジェネレータに橋渡し |
| セッション再開 | **可能**。`options.resume`(セッションID)/`continue`/`forkSession`。session_id は init systemメッセージから取得 | 失敗→再戦で進捗保持 |
| 権限・コマンド制限 | `permissionMode`(`default`/`acceptEdits`/`bypassPermissions`/`plan`/`dontAsk`/`auto`)、`allowedTools`/`disallowedTools`、`canUseTool` コールバック(`updatedInput`で入力書換可)、`PreToolUse` フック。三段で堅牢 | bash実行のホワイトリストは `canUseTool`＋フックで実装 |
| イベント種別 | `SDKMessage` ユニオン: `assistant`(content内に`tool_use`)/`user`(tool_result)/`result`(success・error_max_turns等)/`system`(init)。`includePartialMessages`で部分メッセージ、`SDKToolProgressMessage`等の進捗イベントも取得可 | `tool_use`(`Edit`/`Write`/`Bash`/`Read`)を検知しRPG風ログへ変換 |
| スキル/MCP装備 | **可能**。`options.mcpServers`(オブジェクト)/`skills`(`string[]`or`'all'`)/`plugins`/`agents`。実行中も `setMcpServers`/`toggleMcpServer`/`reconnectMcpServer`/`mcpServerStatus`。カスタムツールは `createSdkMcpServer`/`tool` でインプロセスMCPとして定義 | 報酬で得たスキル/MCPを次戦闘の `query()` 設定に注入＝本物の能力拡張 |
| cwd/モデル | `options.cwd`(既定process.cwd)、`additionalDirectories`、`options.model`(エイリアス可)、`fallbackModel`、実行中`setModel` | 対象repoの作業ディレクトリを指定 |
| 認証 | `ANTHROPIC_API_KEY` 環境変数、または `options.env` で明示 | Runner側のみに保持 |

**不明点**: APIキー以外の認証（サブスク/Bedrock/Vertex）の詳細、npm最新バージョン番号（npmページ403）。

**設計判断**: 鍛冶屋のTDD実行は Agent SDK の `query()` ＋ストリーミング入力モードで実装する。呪文・スキル装備・コマンド制限・ログ演出のすべてが本SDKの標準機能でカバーされる。

---

### トピック2: GitHub auto-merge / PR操作 / CI取得 / テスト

**ソース**: docs.github.com, cli.github.com, vitest.dev, jestjs.io。

**2-1. auto-merge**

- リポジトリ設定で「Allow auto-merge」をオン（必須）＋ branch protection の required status checks が前提（auto-mergeは「即マージできないPR」に対して機能する）。
- 設定には対象リポジトリへの **write 権限** が必要。
- 手段: `gh pr merge --auto --squash`、または GraphQL `enablePullRequestAutoMerge`(入力は PR の **node_id**, `mergeMethod: SQUASH`等)。
- **⚠ 既知の回帰リスク**: 2026年3月頃から、マージ要件未充足の状態で `enablePullRequestAutoMerge` を呼ぶと **HTTP 422** を返す報告あり（GitHubは回帰と認め修正キュー中、最終状態は不明）。

**2-2. PR/ブランチ操作**

- 推奨構成: **simple-git**(clone/branch/commit/push) ＋ **gh CLI or Octokit**(PR作成・auto-merge)。simple-git単体ではPR作成・auto-merge不可。
- fine-grained PAT 権限: `Contents: write`(push)、`Pull requests: write`(PR)、`Commit statuses: Read`/`Checks: Read`(CI取得)。auto-merge専用権限名は存在せず `contents:write`＋`pull_requests:write` でカバーと解釈。

**2-3. CI取得**

- `gh pr checks <PR> --watch --interval <秒> --json`(機械可読、`bucket`=pass/fail/pending等) が最も手軽。
- REST: `GET /repos/{o}/{r}/commits/{ref}/check-runs`(status/conclusion)。GitHub Actions の成否は **check-runs** を見るのが正確（旧 combined status API ではなく）。

**2-4. テストpassのリアルタイム取得**

- **第一選択**: Vitest/Jest のカスタム Reporter。
  - Vitest: `vitest/node` の `startVitest`/`createVitest` ＋ Reporter フック **`onTestCaseResult(testCase)`**(各テスト終了の瞬間に発火) で pass/fail を逐次カウント。`onTestRunStart`/`onTestRunEnd` で全体。（旧 `onTaskUpdate` は使わない）
  - Jest: カスタム Reporter の `onTestCaseResult(test, testCaseResult)`。
- **フォールバック**: 未知ランナーは `npm test` の stdout を正規表現でベストエフォート集計（TTY制御文字・フォーマット差で不安定。演出の正確性をここに依存させない）。
- 注: Vitest Reporter API は minor版で形が変わりうる。

**2-5. プロセス起動**

- `child_process.spawn`(execではない)で別プロセス起動、`child.stdout`/`stderr` を `.on('data')` または `readline` で逐次受信、`child.on('close', code)` で終了判定。`CI=true` でインタラクティブ出力を抑制しパース安定化。
- Runnerプロセスから対象repoの依存・環境を隔離するため、テストは別プロセス(spawn)で実行し、専用Reporterの出力を stdout/ファイル経由で受け取る。

**設計判断**:
1. auto-merge は「`enablePullRequestAutoMerge`を試みる」が、**422を握りつぶさず CIポーリング(`gh pr checks --watch`/check-runs)→成功確認→通常マージ(SQUASH)** のフォールバック経路を必ず実装する。これにより回帰リスクと「CI成功ゲート」要件を両立。
2. テストHP演出は Vitest/Jest 検出時は専用Reporterの `onTestCaseResult`、未知ランナーは stdoutパースの二段構え。
3. デモ用サンプルrepoは Vitest＋GitHub Actions(required check)で構成し、auto-mergeを確実に動かす。

**残リスク**: auto-merge 422回帰の最終状態、fine-grained PATの `Checks` 権限名、Jest `onTestCaseResult` のドキュメント明示は実装直前に各公式ページで最終確認する。
