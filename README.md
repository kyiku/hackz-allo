# GitHub Issue RPG

AIによるTDD開発をRPGの戦闘体験にするWebツール。

## 構成（pnpm モノレポ）

| パッケージ | 役割 |
|---|---|
| `packages/shared` | 共有ドメイン型・WSイベント型 |
| `packages/backend` | Express + WebSocket ハブ |
| `packages/runner` | AIエージェント実行・GitHub連携・SQLite |
| `packages/web` | React 18 + Vite + Phaser + Zustand + Tailwind |

## 必要環境

- **Node.js 22 LTS**（`.nvmrc` 参照）。`better-sqlite3` のネイティブビルド都合で Node 25 以上は非対応。
- pnpm 10.x

## セットアップ

```bash
pnpm install   # better-sqlite3 / esbuild のビルドは pnpm-workspace.yaml で許可済み
```

## 主なスクリプト（ルートから）

```bash
pnpm dev         # 全パッケージを並列で開発起動
pnpm build       # 全パッケージをビルド
pnpm typecheck   # 全パッケージの型チェック
pnpm test        # 全パッケージのテスト（Vitest）
pnpm lint        # ESLint
pnpm format      # Prettier 整形
```

秘密情報は `.env`（Runner側のみ）に置く。`.env.example` を参照。

実装タスクは `.kiro/specs/github-issue-rpg/tasks.md`、進行は GitHub Issue を参照。
