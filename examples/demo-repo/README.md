# demo-repo（GitHub Issue RPG デモターゲット）

GitHub Issue RPG が攻略対象とするデモ用リポジトリの雛形。Vitest 基盤を備え、CIが緑になるベースライン（`calculator`）を含む。

## 使い方（standaloneリポジトリ化）

このディレクトリは monorepo のワークスペース外。実運用では単独の GitHub リポジトリとして push して使う:

```bash
cp -r examples/demo-repo /tmp/demo-repo && cd /tmp/demo-repo
git init && git add -A && git commit -m "init demo repo"
gh repo create <owner>/issue-rpg-demo --private --source=. --push
pnpm install && pnpm test   # 緑であることを確認
```

- CI / required checks / Allow auto-merge の設定: タスク2.2（`.github/workflows/ci.yml` と `scripts/setup-repo.sh`）
- デモ用 open issue の作成: タスク2.3（`scripts/seed-issues.sh`）

## 段階的にpassが見える構成

`src/calculator.ts` ＋ `test/calculator.test.ts` はベースライン（緑）。
デモIssueはここに無い新機能（例: 入力バリデーション）を要求し、AIエージェントが
TDDで実装してテストを段階的にpassさせる＝敵のHPが減る、という流れを再現する。
