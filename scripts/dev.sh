#!/usr/bin/env bash
#
# ローカル一括起動（要件6.2）。Backend＋Runner＋Web を単一ホストで起動する。
# - shared を先にビルド（backend/runner/web が dist を参照）
# - .env があれば環境変数として読み込む（秘密情報は Runner のみが使用）
#
# 使い方: pnpm dev:all  （または bash scripts/dev.sh）
set -euo pipefail

cd "$(dirname "$0")/.."

# Node バージョン注意: better-sqlite3 の都合で Node 22 LTS を推奨（.nvmrc 参照）
node_major="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$node_major" -ge 25 ] || [ "$node_major" -lt 20 ]; then
  echo "warning: Node ${node_major} 検出。Node 20〜24（推奨22）を使ってください（.nvmrc）。" >&2
fi

# .env をエクスポート付きで読み込む（存在すれば）
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
  echo "[dev] .env を読み込みました"
fi

echo "[dev] shared をビルド"
pnpm --filter @github-issue-rpg/shared build

echo "[dev] backend / runner / web を並列起動"
exec pnpm --parallel \
  --filter @github-issue-rpg/backend \
  --filter @github-issue-rpg/runner \
  --filter @github-issue-rpg/web \
  run dev
