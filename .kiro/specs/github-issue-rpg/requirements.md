# 要件定義: GitHub Issue RPG

## 1. 概要・コンセプト

**「AIによるTDD開発を、そのままRPGの戦闘体験にする」** Webツール。

GitHubリポジトリを1つのRPGワールドに変換し、open issue を敵として配置する。プレイヤーが鍛冶屋にissueを依頼すると、ローカルのAIエージェントが**本物のTDD**でコードを実装し、テストが1つ通るたびに敵のHPが削れ、CI成功で撃破、PRが自動マージされる。倒して得た**スキル/MCPを装備すると、AIエージェント自身が実際に強化される**メタ成長ループを持つ。逆方向として、**酒場**でAIに相談すると新しいissue（クエスト）を生成できる。

裏側は本物（実機でClaude Code CLIがコードを直し、git/PR/CIが実際に動く）、表側はRPGとして演出する、という二層構造が本ツールの肝である。

## 2. 対象ユーザー

- ハッカソン参加者、開発チーム、OSSメンテナ
- 特に「issueを読むのが面倒」「どこから手を付けるべきか分からない」開発者
- 前提: 対象リポジトリへの**書き込み権限を持つ**自分／自チームのメンバー

## 3. 用語定義

| 用語 | 定義 |
|---|---|
| ワールド | 1つのGitHubリポジトリに対応するRPG空間 |
| 敵 | 1つの open issue に対応する戦闘対象 |
| 敵HP | そのissueの合格に必要なテストケース数（AIが算出） |
| 戦闘 | 鍛冶屋依頼によりAIがTDDで実装し、テストを通していく一連の過程 |
| 攻撃 | テストが1件passすること（HP-1） |
| 撃破 | 全テストpass かつ CI成功（+PR作成）に到達した状態 |
| 鍛冶屋 | issueをAIに依頼してコード修正を実行させるUI/機能 |
| 酒場 | AIと会話・コード分析を通じて新しいissueを生成する場所 |
| 呪文 | 戦闘中にプレイヤーが送る追加プロンプト（AIへの逐次指示） |
| スキル/MCP | 装備するとrunnerのAIエージェントの能力を実際に拡張する報酬 |
| Runner | ローカルで動作し、Git操作・テスト実行・AI実行・LLM呼び出しを担うプロセス |

## 4. スコープ

### 4.1 MVPに含む（優先度順）

1. **死守コア**: 戦闘一連（鍛冶屋依頼 → TDD戦闘 → PR作成 → CI成功 → auto-merge）
2. **世界生成**（同格で重要）: issue取得 → マップ生成 → 敵配置 → NPC会話表示
3. **成長ループ**（独自性）: 撃破報酬 → スキル/MCP装備 → 次戦闘でAI強化
4. **酒場**: 会話＋コード分析によるissue生成
5. **前提作業**: テスト基盤・CIを整備したデモ用サンプルリポジトリの新規用意

### 4.2 対象外（MVPでは作らない）

- 任意の公開リポジトリへの対応（自／自チームの書き込み可能repoに限定）
- 複数ユーザーの同時プレイ／マルチプレイ
- OAuth/GitHub Appによる認証（PAT手動入力で代替）
- 歩行アニメ用スプライトシートの作り込み（静止スプライト＋背景一枚絵で代替）
- リポジトリ構造やLLMによる動的マップ生成（固定テンプレ＋動的配置で代替）

## 5. 機能要件（ユーザーストーリーと受け入れ基準）

受け入れ基準は EARS（WHEN / IF / WHILE … THE SYSTEM SHALL …）で記述する。

### 5.1 リポジトリ接続・認証

**ユーザーストーリー:** 開発者として、対象リポジトリを接続し、安全に認証情報を扱いたい。Webに秘密情報を残したくない。

- WHEN ユーザーがリポジトリURLを入力し接続を実行する THE SYSTEM SHALL Runner側に保持されたGitHub PATを用いて対象リポジトリへアクセスする
- THE SYSTEM SHALL GitHub PATをRunner側のみに保持し、Web/Backendには秘密情報を保存しない
- IF PATが未設定または無効である THEN THE SYSTEM SHALL 接続を中止し、ユーザーに認証エラーを通知する
- THE SYSTEM SHALL 書き込み権限の無いリポジトリに対しては鍛冶屋依頼（コード修正）を許可しない

### 5.2 issue取得とワールド／マップ生成

**ユーザーストーリー:** 開発者として、open issueがRPGの世界・敵として可視化され、どこから手を付けるか直感的に分かるようにしたい。

- WHEN リポジトリが接続される THE SYSTEM SHALL 当該リポジトリを1つのワールドとして生成する
- THE SYSTEM SHALL open issue を1件につき1体の敵として生成する
- THE SYSTEM SHALL 固定マップテンプレート（数種）のいずれかを選び、その上に敵オブジェクトを動的配置する
- THE SYSTEM SHALL 一定間隔でGitHubをポーリングし、issueの増減をワールドに反映する
- WHEN 新しい open issue が検出される THE SYSTEM SHALL 新たな敵としてマップに追加する
- WHEN issue が close される THE SYSTEM SHALL 対応する敵を撃破済み／撤去として扱う
- THE SYSTEM SHALL マップ・キャラ・敵・鍛冶屋・酒場の描画にAI生成画像アセット（背景一枚絵＋スプライト）を用いる

### 5.3 NPC会話生成

**ユーザーストーリー:** 開発者として、issueの要点を読む手間を省きたい。NPCが噛み砕いて教えてほしい。

- WHEN issueが取得される THE SYSTEM SHALL 各issueについて「要点」「難しいところ」「触りそうなファイル」「勝利条件」をLLMで事前生成し、DBにキャッシュする
- WHEN プレイヤーがNPC（敵）に話しかける THE SYSTEM SHALL キャッシュ済みの会話内容を即時に表示する
- IF 会話のキャッシュが存在しない THEN THE SYSTEM SHALL その場で生成して表示し、結果をキャッシュする

### 5.4 鍛冶屋とTDD戦闘

**ユーザーストーリー:** 開発者として、ボタン1つでAIにissueを解決させ、その過程をRPGの戦闘として見たい。

- WHEN プレイヤーが鍛冶屋にissueを依頼する THE SYSTEM SHALL 当該issueの合格に必要なテストケースをAIで生成し、その件数を敵のHP（最大HP）として設定する
- WHEN 戦闘が開始される THE SYSTEM SHALL Runner上で専用ブランチを作成し、Claude Code CLIによるTDD実装を開始する
- WHILE テストが実行されている THE SYSTEM SHALL passしたテスト件数をWebSocketでリアルタイムに配信する
- WHEN テストが1件passする THE SYSTEM SHALL 敵のHPを1減らす演出を行う
- THE SYSTEM SHALL Runnerの実行ログ（実機ターミナル出力）をRPG風に抽象化してWebに表示する（任意で実出力を確認できる小窓を設ける）
- THE SYSTEM SHALL main ブランチへ直接 push してはならない

### 5.5 プレイヤー介入（呪文）

**ユーザーストーリー:** 開発者として、AIが詰まったら追加指示で軌道修正したい。

- WHILE 戦闘が進行中である THE SYSTEM SHALL 戦闘画面のチャット欄からプレイヤーが追加プロンプト（呪文）を送信できるようにする
- WHEN 呪文が送信される THE SYSTEM SHALL その指示をRunnerの実行中AIに反映し、戦況（HP/ログ）に逐次反映する

### 5.6 戦闘失敗時の挙動

**ユーザーストーリー:** 開発者として、AIが一度で倒せなくても、指示を足して再挑戦させたい。

- IF テストが全て通らない、またはCIが失敗する THEN THE SYSTEM SHALL 撃破を確定せず、敵を残HP状態で維持する
- WHEN プレイヤーが呪文（追加プロンプト）を送信する THE SYSTEM SHALL AIに再挑戦させ、改善されるか（HPが減るか）を再評価する
- THE SYSTEM SHALL 失敗時もそれまでの進捗・ブランチ・ログを保持し、後で再戦可能にする

### 5.7 PR・CI・auto-merge

**ユーザーストーリー:** 開発者として、CIが通った変更だけが安全に取り込まれてほしい。

- WHEN 全テストがpassする THE SYSTEM SHALL commit を作成し、専用ブランチからPRを作成する
- WHEN CIが成功する THE SYSTEM SHALL 敵の撃破を確定する
- WHEN CIが成功している THE SYSTEM SHALL CI成功をゲートとして当該PRをauto-mergeする
- IF CIが失敗している THEN THE SYSTEM SHALL auto-mergeを行わず、敵を未撃破のまま維持する
- 注記: 本要件は sp.md の「差分確認なしでmergeしない」を、**「CI成功を品質ゲートとする」** に置き換えるものである

### 5.8 報酬と成長ループ

**ユーザーストーリー:** 開発者として、敵を倒すたびに自分（とAI）が強くなる手応えがほしい。

- WHEN 敵が撃破される THE SYSTEM SHALL 実装差分の内容からLLMで武器/防具/スキルの名前と性能を生成し、報酬として付与する
- WHEN 敵が撃破される THE SYSTEM SHALL プレイヤーに経験値を付与し、必要に応じてレベルアップさせる
- WHEN プレイヤーがスキル/MCPを装備する THE SYSTEM SHALL 次回以降の戦闘でRunnerのAIエージェントに当該スキル/MCPを実際に有効化する
- THE SYSTEM SHALL 獲得した報酬・装備状態・EXP・レベルをDBに永続化する

### 5.9 酒場（issue生成）

**ユーザーストーリー:** 開発者として、思いついた仕様追加をAIに相談し、整ったissueとして起票したい。

- WHEN プレイヤーが酒場でAIに要望を会話で伝える THE SYSTEM SHALL 要望とリポジトリのコード分析を組み合わせてissue案（タイトル/本文/ラベル）を生成する
- WHEN issue案が生成される THE SYSTEM SHALL プレイヤーに案を提示する
- WHEN プレイヤーが登録を確定する（ワンクリック） THE SYSTEM SHALL 当該issueをGitHubに登録し、新たな敵としてワールドに反映する

## 6. 非機能要件

### 6.1 安全・運用

- THE SYSTEM SHALL AIの全実行ログをDBに保存し、リプレイ／監査を可能にする
- THE SYSTEM SHALL Runnerが実行可能なコマンドをホワイトリストで制限する
- THE SYSTEM SHALL すべてのコード変更を専用ブランチで行い、mainへ直接pushしない
- THE SYSTEM SHALL プレイヤーがいつでもAI作業を停止できる緊急停止／中断ボタンを提供する
- THE SYSTEM SHALL GitHub PAT等の秘密情報をRunner側のみに保持する

### 6.2 性能・UX

- THE SYSTEM SHALL NPC会話を事前生成・キャッシュし、クリック時に即時表示する
- THE SYSTEM SHALL テストpass状況をリアルタイム（WebSocket）で反映し、戦闘のテンポを損なわない
- THE SYSTEM SHALL デモを単一ローカルマシン上で完結して起動できる（ネットワーク依存を最小化）

## 7. 技術制約・前提

| 項目 | 決定 |
|---|---|
| 言語 | 全体 TypeScript（フロント／Backend／Runner） |
| 描画 | Phaser.js（タイルマップ＋スプライト）、RPGツクール風 |
| アセット | AI生成画像（背景一枚絵＋スプライト重ね） |
| アーキテクチャ | Web（Phaser）⇄ WebSocket ⇄ Backend API（Web配信/DB/WSハブ/ポーリング）⇄ Runner（Git/テスト/CLI/LLM） |
| デモ起動形態 | 全てローカル1台 |
| 永続化 | DB（SQLite想定） |
| 認証 | GitHub PAT手動入力（Runner側保持） |
| AI実装（鍛冶屋） | Claude Code CLI をRunnerから起動 |
| LLM（NPC会話/HP算出/issue生成/報酬生成） | RunnerからAnthropic API／Agent SDKで呼び出し |
| リアルタイム通信 | WebSocket |
| issue取得 | 定期ポーリング |
| 開発体制 | 二人フルスタック |

## 8. 前提作業

- THE TEAM SHALL TDD戦闘を成立させるため、テストランナーとCIが整備されたデモ用サンプルリポジトリを新規に用意する（テストが段階的にpassしていく様子を見せられる構成にする）

## 9. 未解決事項・リスク

- **auto-mergeのリスク**: CIをゲートにしても、CI設定が甘いと不完全な変更がmainに入りうる。デモ用repoのCIを十分に設計する必要がある。
- **必要テスト数（HP）算出の安定性**: AIによるテストケース生成件数がブレると、敵HPが毎回変動しデモの再現性が下がる懸念。プロンプト固定・キャッシュ等の対策を設計フェーズで検討する。
- **スキル/MCP装備の実効化**: 報酬が実際にAI能力へ反映される範囲（どのMCP/スキルをアンロック対象にするか）の具体カタログが未定。設計フェーズで初期セットを定義する。
- **呪文（介入）の反映方法**: 実行中のClaude Code CLIへ追加指示を割り込ませる技術的手段（セッション継続／キュー投入等）の具体は設計フェーズで確定する。
- **Runner⇄Backend分離とローカル単一起動の両立**: 分離アーキを保ちつつ1台で起動する構成（プロセス分割／起動スクリプト）を設計フェーズで具体化する。

---

> 本要件定義は次フェーズ（`/kiro:spec-design github-issue-rpg`）で技術設計に展開する。spec成果物はgitにコミットしない方針（CLAUDE.md準拠）。
