# 実装タスク: GitHub Issue RPG

> `requirements.md` / `design.md` / `research.md` に基づく実装タスク。
> `(P)` は他タスクと並行実行可能。`- [ ]*` は受入基準を満たした後に後回し可能な任意のテスト。
> 各サブタスクは1〜3時間を目安。要件IDは requirements.md の節番号に対応。

## 1. プロジェクト基盤

- [ ] 1.1 モノレポ構成とTypeScript環境を整備する（web / backend / runner / shared パッケージ、Vite・tsconfig・lint）
  - _要件: 7_
- [ ] 1.2 共有型(shared)を定義する（World/Enemy/Battle/Reward/WSイベント等のドメイン型）
  - _要件: 4, 6_
- [ ] 1.3 SQLiteスキーマとデータアクセス層を実装する（World/Enemy/NpcDialogue/Battle/TestEvent/Reward/Player/Equipment/WorkLog）
  - _要件: 4, 6.1_
- [ ] 1.4 設定・秘密情報のロードを実装する（Runner側のみPAT・ANTHROPIC_API_KEYを環境変数で保持）
  - _要件: 5.1, 6.1_

## 2. デモ用サンプルリポジトリ準備（前提作業）

- [ ] 2.1 Vitest＋テスト基盤を備えたサンプルリポジトリを新規作成する（段階的にpassが見えるテスト構成）
  - _要件: 8_
- [ ] 2.2 GitHub Actions のCIと required status checks／Allow auto-merge を設定する
  - _要件: 5.7, 8_
- [ ] 2.3 デモ用の open issue を数件用意する（bug/refactor/security ラベル付き）
  - _要件: 5.2, 8_

## 3. GitHub連携基盤（GitHubGateway）

- [ ] 3.1 (P) issue一覧取得とリポジトリ接続を実装する（PAT認証、権限チェック）
  - _要件: 5.1, 5.2_
- [ ] 3.2 ブランチ作成・commit・push を実装する（simple-git、`forge/issue-<n>-<ts>`、main直push禁止）
  - _要件: 5.4, 6.1_
- [ ] 3.3 PR作成を実装する（Octokit/gh）
  - _要件: 5.7_
- [ ] 3.4 CIポーリングを実装する（check-runs / `gh pr checks --watch --json`、conclusion判定）
  - _要件: 5.7_
- [ ] 3.5 auto-merge とフォールバックを実装する（`enablePullRequestAutoMerge` 試行→422時はCI成功確認後に通常SQUASHマージ）
  - _要件: 5.7_
- [ ] 3.6 diff取得を実装する（報酬生成用）
  - _要件: 5.8_

## 4. AI実行基盤

- [ ] 4.1 (P) Anthropic SDKラッパを実装する（`claude-opus-4-8`、Zod構造化出力、ストリーミング）
  - _要件: 7_
- [ ] 4.2 ForgeAgent を実装する（Claude Agent SDK `query()`、ストリーミング入力モード、cwd/model指定）
  - _要件: 5.4_
- [ ] 4.3 コマンド実行ホワイトリスト制御を実装する（`allowedTools`＋`canUseTool`＋`PreToolUse`フック）
  - _要件: 6.1_
- [ ] 4.4 ForgeAgentのイベント変換を実装する（`tool_use`/`tool_result`/進捗 → RPG風ログへ抽象化）
  - _要件: 5.4, 6.2_
- [ ] 4.5 呪文の割り込みと緊急停止を実装する（AsyncGeneratorへの追加メッセージ橋渡し、`interrupt()`）
  - _要件: 5.5, 6.1_

## 5. ワールド生成とNPC

- [ ] 5.1 敵ステータス算出を実装する（EnemyStats: 必要テスト生成→HP、ルールベースで難易度Lv/弱点）
  - _要件: 5.4_
- [ ] 5.2 (P) NPC会話の事前生成とDBキャッシュを実装する（要点/難所/ファイル/勝利条件）
  - _要件: 5.3, 6.2_
- [ ] 5.3 ワールド/マップ生成を実装する（1repo=1World、1issue=1敵、固定テンプレ＋issue番号シードで配置）
  - _要件: 5.2_
- [ ] 5.4 issue定期ポーリングと差分反映を実装する（新規→敵追加、close→撤去）
  - _要件: 5.2_

## 6. 戦闘システム（死守コア）

- [ ] 6.1 TestWatcher を実装する（spawnで別プロセス実行、Vitest/Jestカスタムレポーター `onTestCaseResult`、未知ランナーはstdoutパース）
  - _要件: 5.4, 6.2_
- [ ] 6.2 戦闘状態機械を実装する（出現→RED→戦闘中→詰め→撃破／失敗分岐）
  - _要件: 5.4, 5.6_
- [ ] 6.3 1pass=HP-1 のリアルタイム反映を実装する（TestWatcher→HP更新→WS配信）
  - _要件: 5.4, 6.2_
- [ ] 6.4 鍛冶屋依頼から戦闘開始までを結線する（依頼→必要テスト生成→ブランチ作成→ForgeAgent起動）
  - _要件: 5.4_
- [ ] 6.5 失敗時の挙動を実装する（テスト未通過/CI失敗→残HP維持、呪文で再戦、進捗・ブランチ保持）
  - _要件: 5.6_

## 7. 撃破・報酬・成長

- [ ] 7.1 撃破確定とauto-merge連携を実装する（全pass→PR→CI成功で撃破確定→auto-merge）
  - _要件: 5.7_
- [ ] 7.2 (P) 報酬生成を実装する（RewardForge: diffから武器/防具/スキル名・性能をLLM生成）
  - _要件: 5.8_
- [ ] 7.3 EXP/レベルと装備を実装する（撃破でEXP付与・レベル更新、Equipment永続化）
  - _要件: 5.8_
- [ ] 7.4 スキル/MCP装備のForgeAgent反映を実装する（装備中スキル/MCPを次回 `query()` の `mcpServers`/`skills` に注入）
  - _要件: 5.8_
- [ ] 7.5 パーティ（サブエージェント）成長と並列委譲を実装する（party_size算出、`query()` の `agents` 定義、2体以上で並列委譲を有効化）
  - _要件: 5.8, 5.10_

## 8. 酒場（issue生成）

- [ ] 8.1 issue案生成を実装する（Tavern: 会話＋コード分析でタイトル/本文/ラベル生成）
  - _要件: 5.9_
- [ ] 8.2 issue案の提示とワンクリック登録を実装する（確定でGitHub登録→敵としてワールド反映）
  - _要件: 5.9_

## 9. Backend（WSハブ・オーケストレーション）

- [ ] 9.1 WebSocketハブとREST APIを実装する（§6イベント表に準拠、Runnerイベントの永続化とWeb投影）
  - _要件: 6.1, 6.2_
- [ ] 9.2 Runnerジョブのオーケストレーションを実装する（cmd.forge/spell/stop/tavern のディスパッチ）
  - _要件: 5.4, 5.5, 5.9_
- [ ] 9.3 作業ログ保存を実装する（全AI実行ログをWorkLogへ）
  - _要件: 6.1_
- [ ] 9.4 編成/チューニングAPIと状態投影を実装する（Loadout取得・更新、player.status/world.assignments配信、buildAgentOptions）
  - _要件: 5.10_

## 10. フロントエンド（Phaser + React）

- [ ] 10.1 (P) WebSocketクライアントと状態管理を実装する（イベント受信、ゲーム状態の投影）
  - _要件: 6.2_
- [ ] 10.2 Phaserマップ描画を実装する（AI生成PNG背景＋タイル＋スプライト、グリッド移動、敵接触で戦闘遷移）
  - _要件: 5.2_
- [ ] 10.3 戦闘画面を実装する（HPバー、RPG風ログ表示、呪文チャット欄、緊急停止ボタン）
  - _要件: 5.4, 5.5, 6.1_
- [ ] 10.4 (P) 鍛冶屋UIを実装する（依頼ボタン、対象issue選択）
  - _要件: 5.4_
- [ ] 10.7 (P) ステータス/編成画面を実装する（装備付け替え、AIチューニング、状態閲覧、アサインissue一覧、パーティ表示）
  - _要件: 5.8, 5.10_
- [ ] 10.5 (P) 酒場UIを実装する（会話入力、issue案プレビュー、ワンクリック登録）
  - _要件: 5.9_
- [ ] 10.6 (P) AI生成アセットの作成と組み込み（街/キャラ/敵/鍛冶屋/酒場のPNG）
  - _要件: 5.2_

## 11. 安全・運用と起動

- [ ] 11.1 ローカル一括起動スクリプトを実装する（Backend＋Runner＋Webを単一ホストで起動）
  - _要件: 6.2_
- [ ] 11.2 安全要件の結線を確認する（main直push禁止・コマンド制限・作業ログ・緊急停止の通し動作）
  - _要件: 6.1_

## 12. 統合検証

- [ ] 12.1 死守コアのE2Eを実装する（デモrepoに対し 鍛冶屋依頼→TDD戦闘→PR→CI→撃破→auto-merge をPlaywrightで通す）
  - _要件: 5.4, 5.7_
- [ ]* 12.2 ユニットテストを拡充する（HP算出/配置アルゴリズム/報酬パース等の純粋ロジック80%+）
  - _要件: 5.4, 5.8_
- [ ]* 12.3 成長ループと酒場のE2Eを追加する（報酬→装備→強化、酒場→issue生成→敵反映）
  - _要件: 5.8, 5.9_
