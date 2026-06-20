# GitHub Issue RPG

AIによるTDD開発をRPGの戦闘体験にするWebツール。Web版とiOSネイティブ（WebView）版を単一リポジトリに集約している。

## 構成

`packages/*`（Webスタックの pnpm モノレポ）と `mobile/`（iOSネイティブ）に分かれる。

### Web（`packages/*`）

| パッケージ | 役割 |
|---|---|
| `packages/shared` | 共有ドメイン型・WSイベント型 |
| `packages/backend` | Express + WebSocket ハブ |
| `packages/runner` | AIエージェント実行・GitHub連携・SQLite |
| `packages/web` | React 18 + Vite + Phaser + Zustand + Tailwind |

Web フロントは Cloudflare Pages にデプロイ（https://github-issue-rpg.pages.dev ）。
WS接続先は同一オリジン `/ws` が既定だが、`?backend=wss://<URL>/ws`（または http(s) オリジン）で上書きでき、値は `localStorage` に保存される。

### Mobile（`mobile/`）

iOSネイティブアプリ（Swift / SwiftUI、XcodeGen でプロジェクト生成）。`mobile/TableBangConcentration/Web/` の `WKWebView` で上記デプロイ済みWebを全画面表示する。`.xcodeproj` は管理対象外で `project.yml` から生成する。

```bash
cd mobile
xcodegen generate
xcodebuild build -project TableBangConcentration.xcodeproj \
  -scheme TableBangConcentration \
  -destination 'platform=iOS Simulator,name=iPhone 17'
```

> ARゲーム（台パン神経衰弱）の画面は `mobile/TableBangConcentration/App/RootView` として温存しており、`TableBangApp.swift` の表示を差し替えれば復帰できる。詳細は `mobile/README.md`。

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
