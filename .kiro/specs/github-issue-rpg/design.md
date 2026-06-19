# 技術設計: GitHub Issue RPG

> 本書は `requirements.md` を技術設計へ展開したもの。調査ログは `research.md` を参照。

## 1. アーキテクチャパターン & 境界マップ

「分離アーキテクチャ」を採用しつつ、デモは単一ローカルマシンで起動する（プロセスは分離、配置は同一ホスト）。

```
┌────────────────────────────────────────────────────────────┐
│ ブラウザ                                                      │
│  Web (Phaser.js + React + TS)                                │
│   - RPGマップ描画 / 戦闘画面 / 鍛冶屋UI / 酒場UI              │
│   - WebSocketクライアント                                     │
└───────────────▲───────────────────────────┬─────────────────┘
                │ WebSocket (イベント受信)    │ REST/WS (コマンド送信)
┌───────────────┴───────────────────────────▼─────────────────┐
│ Backend API (Node + TS, Fastify想定)                         │
│   - 静的配信 / REST API / WebSocketハブ(リレー)               │
│   - ゲーム状態DB (SQLite) の所有                              │
│   - issueポーリングのスケジューラ                            │
│   - Runnerとの内部接続（WebSocket or IPC）                   │
└───────────────▲───────────────────────────┬─────────────────┘
                │ ジョブ結果/ログ             │ ジョブ指示
┌───────────────┴───────────────────────────▼─────────────────┐
│ Local Runner (Node + TS)                                     │
│   - GitHub操作 (PAT保持): issue取得/branch/commit/PR/merge   │
│   - Claude Agent SDK 実行 (鍛冶屋のTDD)                       │
│   - Anthropic API 呼び出し (NPC会話/HP算出/issue生成/報酬)    │
│   - テスト実行 & pass数ストリーミング                        │
│   - 実行可能コマンドのホワイトリスト制御                     │
└──────────────────────────────────────────────────────────────┘
                │
                ▼  GitHub API / git / tests / Anthropic API
```

### 境界の責務

| ユニット | 責務 | 依存 | 秘密情報 |
|---|---|---|---|
| Web | 表示と入力のみ。ゲームロジックを持たない | Backend (WS/REST) | なし |
| Backend | 状態の真実(DB)、WSハブ、ポーリング、Runnerオーケストレーション | DB, Runner | なし（DBのみ） |
| Runner | 副作用の実行（Git/AI/テスト）。秘密情報の唯一の保持者 | GitHub, Anthropic | PAT, ANTHROPIC_API_KEY |

**設計判断**: LLM・Git・テストをすべてRunnerに集約し、Backendは「状態とリレー」に徹する。これにより秘密情報がWeb/Backendに漏れない（sp.md安全要件）。BackendとRunnerは別プロセスだが、デモ時は同一ホストで起動スクリプトから一括起動する。

## 2. 技術スタック & 整合

| レイヤ | 採用 | 根拠 |
|---|---|---|
| 言語 | TypeScript 全レイヤ | 二人フルスタック・一貫性。Agent SDK/Anthropic SDKがTS対応 |
| フロント | React + Phaser.js + Vite | RPGツクール風タイル描画はPhaser、UI/HUDはReact |
| 描画素材 | AI生成PNG（背景一枚絵＋スプライト） | 世界観統一。Phaserに画像読込 |
| Backend | Node + Fastify | 軽量・WS/REST両対応 |
| リアルタイム | WebSocket (ws or socket.io) | 双方向（ログ配信＋呪文送信） |
| 永続化 | SQLite (better-sqlite3 or Prisma) | ローカル単一ホスト・セッション跨ぎ保持 |
| AI実装(鍛冶屋) | Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) | ※research.md参照 |
| LLM(会話/算出/生成) | Anthropic SDK (`@anthropic-ai/sdk`), `claude-opus-4-8` | 構造化出力(`output_config.format`)で安定生成 |
| GitHub操作 | Octokit + simple-git（or gh CLI） | ※research.md参照 |
| テスト実行 | child_process + 各repoのテストランナー | ※research.md参照 |

## 3. ゲームルールの数値モデル

戦闘の核は「敵HP = 必要テスト数、1テストpass = 攻撃(HP-1)」。

### 3.1 敵（issue）のステータス算出

```
敵HP(最大) = AIが生成した「合格に必要なテストケース」の件数
            （TDDのREDフェーズ＝全テスト失敗＝敵フルHP）
```

補助ステータス（演出・難易度表示用、ルールベースで算出）:

| ステータス | 算出材料 | 用途 |
|---|---|---|
| 推定難易度 (Lv) | issue本文長 + ラベル(bug/refactor/security) + 関連ファイル数 | マップ上の敵の見た目・配置 |
| 弱点 | ラベル種別 | NPC会話のヒント表示 |

> sp.mdの「攻撃力/防御力/会心率」モデルは、TDD戦闘モデル（pass=ダメージ）へ置換。テストコードの扱いは「テストを書く=敵のHPを定義する(RED)」「テストを通す=攻撃」に統合される。

### 3.2 戦闘の進行（状態機械）

```
[出現] issue取得 → 敵生成（HP未確定）
   │  鍛冶屋に依頼
   ▼
[RED] AIが必要テストを生成 → 敵HP=テスト数確定、全テスト失敗
   │  AIがTDD実装、テスト実行をループ
   ▼
[戦闘中] テストpassごとにHP-1（WSでリアルタイム配信）
   │  全テストpass(HP=0)
   ▼
[詰め] commit → PR作成 → CI実行
   │  CI成功
   ▼
[撃破] 敵撃破確定 → auto-merge → 報酬生成（武器/スキル/EXP）

※ 失敗分岐: テストが通らない/CI失敗 → [戦闘中]に留まる
   → プレイヤーが呪文(追加プロンプト)送信 → AI再挑戦
```

### 3.3 報酬と成長

| 要素 | 算出 |
|---|---|
| 武器/防具/スキル名・性能 | LLMが実装差分（diff）から生成 |
| EXP | 敵の推定難易度に比例 |
| レベル | EXP累積で上昇 |
| スキル/MCP装備 | 装備したスキル/MCPを次回戦闘のAgent SDK実行設定に反映（本物の能力拡張）※research.md参照 |

## 4. データモデル (SQLite)

```
World        (id, repo_url, name, created_at)
Enemy        (id, world_id, issue_number, title, body, max_hp, current_hp,
              level, weakness, state, map_x, map_y, created_at)
NpcDialogue  (id, enemy_id, summary, difficulty, files, victory_condition)  -- 事前生成キャッシュ
Battle       (id, enemy_id, branch_name, pr_number, ci_status, state, started_at)
TestEvent    (id, battle_id, test_name, status, at)  -- pass/failの逐次ログ
Reward       (id, battle_id, kind, name, stats_json, acquired_at)
Player       (id, name, exp, level)
Equipment    (id, player_id, reward_id, slot, equipped)  -- 装備中スキル/MCP
WorkLog      (id, battle_id, role, content, at)  -- AI実行ログ（監査）
```

**不変条件**: ゲーム状態の真実はBackendのDB。RunnerはイベントをBackendに送り、Backendが永続化する。WebはDBの投影を受け取るのみ。

## 5. ワールド/マップ生成

- 1 repo = 1 World、1 open issue = 1 Enemy。
- マップは**固定テンプレート数種**（RPGツクール風タイル）をコードで保持。
- issue取得時、各enemyを空きタイルに動的配置（配置アルゴリズム: 難易度で領域分け→空きマスにランダム配置、決定的にするためissue番号をシードに使用）。
- 描画: Phaserで背景PNG＋タイルレイヤ＋スプライト（敵/鍛冶屋/酒場/プレイヤー）。プレイヤーはグリッド移動、敵に接触で戦闘画面へ遷移。

## 6. リアルタイム通信（WebSocketイベント設計）

Backend ⇄ Web（および Runner → Backend）で流すイベント（方向と型）:

| イベント | 方向 | ペイロード |
|---|---|---|
| `world.updated` | →Web | world/enemies スナップショット |
| `battle.started` | →Web | enemyId, maxHp |
| `battle.hp` | →Web | enemyId, currentHp（1pass毎） |
| `battle.log` | →Web | RPG風に抽象化したログ行 |
| `battle.defeated` | →Web | enemyId, reward |
| `battle.failed` | →Web | enemyId, 理由 |
| `cmd.forge` | Web→ | enemyId（鍛冶屋依頼） |
| `cmd.spell` | Web→ | battleId, prompt（呪文＝追加指示） |
| `cmd.stop` | Web→ | battleId（緊急停止） |
| `tavern.issueDraft` | →Web | issue案 |
| `cmd.tavern.publish` | Web→ | issue案の確定登録 |

## 7. 安全・運用設計

- **コマンド制限**: Agent SDKの権限制御 ＋ Runner側の実行ホワイトリストで二重化。※research.md参照
- **専用ブランチ**: `forge/issue-<n>-<timestamp>` 形式。mainへ直接pushしない。
- **auto-merge**: CI成功をゲート。CIが品質ゲートとして「差分確認なしmerge禁止」を代替。※research.md参照
- **作業ログ**: 全AI実行ログをWorkLogテーブルに保存。
- **緊急停止**: `cmd.stop`でRunnerの実行中Agentセッションを中断。

## 8. コンポーネント & インターフェース契約

Runnerを責務ごとに小さなモジュールへ分割する（高凝集・低結合）。各モジュールは「何をするか／どう使うか／何に依存するか」が明確で、独立してテストできる。

### 8.1 ForgeAgent（鍛冶屋のTDD実行）— Claude Agent SDK

- **何をする**: issueを受け取り、専用ブランチ上でTDD実装を進める。実行イベント（tool_use/tool_result/進捗）を逐次emitし、呪文の割り込みを受け付ける。
- **依存**: `@anthropic-ai/claude-agent-sdk` の `query()`。
- **方式**（research.md トピック1）:
  - `prompt` に **AsyncGenerator** を渡してストリーミング入力モードで起動。初回メッセージはissue＋TDD指示。
  - 呪文は外部キュー（WSの `cmd.spell`）→ジェネレータが `yield` で実行中セッションへ追加。
  - `options`: `cwd`=対象repoのワークツリー、`model`=`claude-opus-4-8`、`allowedTools`＋`canUseTool`＋`PreToolUse`フックでコマンド制限、`mcpServers`/`skills`=装備中の報酬を注入。
  - `for await` で `SDKMessage` を受け、`assistant`内の`tool_use`を `battle.log`（RPG風抽象化）へ変換してemit。
  - `interrupt()` を `cmd.stop` にマップ（緊急停止）。
- **インターフェース（概念）**:
  ```
  startForge(issue, repoPath, equipment): EventEmitter
    emits: 'tool', 'message', 'result'
  castSpell(prompt): void            // 実行中セッションへ追加指示
  stop(): void                       // interrupt()
  ```

### 8.2 EnemyStats（HP算出 & 必要テスト生成）

- **何をする**: issueから「合格に必要なテストケース」をLLMで生成し、件数を敵HPとする。補助ステータス（難易度Lv/弱点）はルールベースで算出。
- **依存**: `@anthropic-ai/sdk`（`messages.parse` + Zodで構造化出力）、`claude-opus-4-8`。
- **契約**: `computeEnemy(issue) -> { maxHp, testCases[], level, weakness }`。

### 8.3 TestWatcher（テストpassのリアルタイム取得）

- **何をする**: テストを別プロセスで実行し、pass/fail件数を逐次emit（1pass=HP-1）。
- **依存**: `child_process.spawn`、Vitest/Jestカスタムレポーター。
- **方式**（research.md トピック2-4/2-5）:
  - 対象repoのランナーを検出。Vitest/Jest → 専用Reporterの `onTestCaseResult` でpassイベントをemit（第一選択）。
  - 未知ランナー → `npm test` の stdoutを `spawn`＋`readline`でパース（フォールバック、`CI=true`で安定化）。
- **契約**: `watch(repoPath) -> EventEmitter('pass'|'fail'|'done')`。

### 8.4 GitHubGateway（Git/PR/CI/merge）

- **何をする**: ブランチ作成・commit・push・PR作成・CIポーリング・auto-merge。
- **依存**: simple-git（ローカルgit）＋ Octokit/gh（PR・auto-merge・CI）。PATはRunner環境変数。
- **方式**（research.md トピック2）:
  - ブランチ `forge/issue-<n>-<ts>` をsimple-gitで作成・commit・push（mainへ直接pushしない）。
  - PR作成（Octokit `POST /pulls` or `gh pr create`）。
  - **auto-merge**: `enablePullRequestAutoMerge`(GraphQL, PR node_id, SQUASH) を試行。**422時は握りつぶさず**、CIポーリング(`gh pr checks --watch --json` or REST check-runs)→成功→通常マージ(SQUASH)へフォールバック。
  - **撃破確定**: CI成功（check-runs の conclusion=success）で確定。
- **契約**: `createBranch / commit / push / openPr / pollCi / autoMergeOrFallback`。

### 8.5 RewardForge（報酬生成）& Equipment（装備）

- **何をする**: 撃破時、実装差分(diff)からLLMで武器/防具/スキル名・性能を生成。EXP付与・レベル更新。装備中スキル/MCPを `ForgeAgent` の `options` に反映。
- **依存**: `@anthropic-ai/sdk`（構造化出力）、GitHubGateway（diff取得）。
- **契約**: `generateReward(diff) -> Reward`、`equip(playerId, rewardId)`。

### 8.6 NpcDialogue（NPC会話）

- **何をする**: issue取得時に「要点/難所/触りそうなファイル/勝利条件」をLLMで事前生成しDBキャッシュ。
- **依存**: `@anthropic-ai/sdk`（構造化出力）、Backend DB。
- **契約**: `generateDialogue(issue) -> NpcDialogue`（取得時バッチ実行）。

### 8.7 Tavern（issue生成）

- **何をする**: ユーザー要望＋コード分析からissue案（タイトル/本文/ラベル）を生成し提示。確定でGitHubに登録。
- **依存**: `@anthropic-ai/sdk`、GitHubGateway（コード参照・issue登録）。
- **契約**: `draftIssue(request, repoContext) -> IssueDraft`、`publishIssue(draft)`。

### 8.8 Backend（WSハブ / DB / ポーリング）

- **何をする**: WSイベントのリレー、ゲーム状態DBの所有、issue定期ポーリング、Runnerジョブのオーケストレーション。
- **依存**: Fastify、better-sqlite3、ws、Runner接続。
- **契約**: §6のWSイベント表に準拠。Runnerからのイベントを永続化しWebへ投影。

## 9. テスト戦略

- ユニット: HP算出/配置アルゴリズム/報酬生成のパース等、純粋ロジックを80%+カバー。
- 統合: Runner⇄Backendのジョブフロー、WS配信。
- E2E: デモ用サンプルrepoに対し「鍛冶屋依頼→TDD戦闘→PR→CI→撃破」をPlaywrightで通す。
- 前提: テスト/CI整備済みのデモ用サンプルrepoを新規用意（requirements §8）。

## 10. 未解決事項とリスク

調査により当初の不確実点は解消（詳細は research.md）。実装段階で監視すべき残リスク:

- **auto-merge 422回帰**: `enablePullRequestAutoMerge` がマージ要件未充足時に422を返す既知の回帰。→ §8.4のCIポーリング＋通常マージのフォールバックで吸収する。実装直前に最終状態を確認。
- **HP算出の再現性**: AIが生成する必要テスト数がブレると敵HPがデモ毎に変動。→ プロンプト固定＋構造化出力＋（同一issueは）DBキャッシュで安定化。
- **Vitest Reporter APIの変更**: minor版でフック形が変わりうる。→ バージョン固定し、未知ランナーはstdoutフォールバック。
- **fine-grained PATの `Checks` 権限名**: 実装直前に公式権限表で確認。
- **デモ用repoのCI設計**: auto-mergeが効くよう required status checks を設定したVitest＋GitHub Actions構成を新規作成（requirements §8）。
```
