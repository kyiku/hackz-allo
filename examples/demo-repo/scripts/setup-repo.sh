#!/usr/bin/env bash
#
# デモ用リポジトリに CI 必須チェックと Allow auto-merge を設定する（要件5.7, 8）。
# 前提: gh CLI 認証済み、リポジトリは作成済み（README参照）。
#
# 使い方: ./scripts/setup-repo.sh <owner>/<repo>
set -euo pipefail

REPO="${1:?usage: setup-repo.sh <owner>/<repo>}"
CHECK_NAME="test" # .github/workflows/ci.yml の job 名と一致させる

echo "==> Allow auto-merge を有効化"
gh api -X PATCH "repos/${REPO}" -F allow_auto_merge=true -F delete_branch_on_merge=true >/dev/null

echo "==> main に branch protection（required status checks: ${CHECK_NAME}）を設定"
gh api -X PUT "repos/${REPO}/branches/main/protection" \
  -H "Accept: application/vnd.github+json" \
  --input - <<JSON >/dev/null
{
  "required_status_checks": { "strict": true, "contexts": ["${CHECK_NAME}"] },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null
}
JSON

echo "==> 完了: ${REPO} は auto-merge 可能、main は ${CHECK_NAME} 成功を要求"
