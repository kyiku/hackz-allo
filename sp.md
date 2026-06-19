要件定義: GitHub Issue RPG
コンセプト
GitHubのissueをRPG世界に変換する。issueは街・ダンジョン・敵になり、NPCが作業内容や難所を説明する。鍛冶屋AIに依頼すると、専用ブランチで修正案を作り、PRが生成される。PRやテスト、CI結果に応じて敵が倒れ、武器や防具が手に入る。
ユーザー
ハッカソン参加者、開発チーム、OSSメンテナ。特に「issueを読むのが面倒」「どこから手を付けるべきか分からない」人向け。
基本フロー
GitHubリポジトリを接続する
open issueを取得する
issueごとに街・敵・NPCを生成する
NPCが「要点」「難しいところ」「触りそうなファイル」「勝利条件」を話す
鍛冶屋にissueを依頼する
ローカルrunnerが専用ブランチでAI修正を実行する
テストを走らせる
commit/PRを作る
PR内容とCI結果から武器・経験値・敵撃破を反映する
ゲームルール
敵の最大HPはissueの複雑度で決める。
材料:
issue本文の長さと曖昧さ
bug/refactor/securityなどのラベル
関連しそうなファイル数
変更影響範囲
過去CI失敗履歴
テスト不足度
PRが出ると敵にダメージが入る。
攻撃力 = 実装差分の有効度
防御力 = テスト不足
会心率 = 追加テスト量
撃破条件 = CI成功 + PR作成
テストコードはHPそのものより、防御力を下げる/会心率を上げる扱いがよさそうです。
例:
auth.ts を修正した: 42ダメージ
auth.test.ts を追加した: 敵の防御力ダウン
CI成功: 撃破可能状態
PR作成: 「例外処理の短剣 +2」獲得
必要機能 MVP
GitHub repo URL入力
issue一覧取得
issueからRPGマップ生成
issue詳細画面
NPC会話生成
HP/防御力/弱点表示
鍛冶屋UI
ローカルrunner起動
AIによる修正方針生成
ブランチ作成
commit作成
PR作成
PR生成後に武器生成
実装方式
おすすめはこれです。
Web UI
  ↓
Backend API
  ↓ WebSocket/SSE
Local Runner
  ↓
Claude Agent SDK / Claude Code CLI
  ↓
GitHub repo / tests / git push / PR
WebアプリはRPG体験と進捗表示に集中。
ローカルrunnerは実際のコード編集、テスト、git操作を担当。
Remote Control的な連携
できます。Claude Codeの画面そのものを遠隔操作するというより、Webアプリからローカルrunnerに命令を送る形にする。
Webの鍛冶屋ボタン
→ local runnerにジョブ送信
→ runnerがClaude Agent SDKで作業
→ ログをWebSocketでWebに流す
→ ユーザーが承認
→ commit/PR
これなら「Webから鍛冶屋を操作している」体験になるし、安全制御もしやすいです。
安全要件
mainへ直接pushしない
必ず専用ブランチ
PR作成までを基本にする
GitHub tokenはローカルrunner側だけに置く
Web側には秘密情報を置かない
差分確認なしでmergeしない
実行可能コマンドを制限する
作業ログを保存する
ユーザー承認ポイントを入れる
結論として、ターミナル単体ではなくWeb + ローカルrunnerがベストです。
見た目はRPG、裏側はClaude系エージェントとGitHub操作。ハッカソンで見せるならこの構成が一番強いです。