#!/usr/bin/env bash
#
# デモ用の open issue を作成する（要件5.2, 8）。bug/refactor/security ラベル付き。
# 各issueは demo-repo に未実装の新機能を要求し、AIエージェントがTDDで攻略する敵になる。
#
# 前提: gh CLI 認証済み、リポジトリ作成済み（#5 README参照）。
# 使い方: ./scripts/seed-issues.sh <owner>/<repo>
set -euo pipefail

REPO="${1:?usage: seed-issues.sh <owner>/<repo>}"

ensure_label() {
  # ラベルが無ければ作成（既存ならスキップ）
  gh label create "$1" --repo "$REPO" --color "$2" >/dev/null 2>&1 || true
}

ensure_label bug d73a4a
ensure_label refactor a2eeef
ensure_label security b60205

create_issue() {
  local title="$1" label="$2" body="$3"
  gh issue create --repo "$REPO" --title "$title" --label "$label" --body "$body" >/dev/null
  echo "  created [$label] $title"
}

echo "==> デモIssueを作成: $REPO"

# デモはハッカソン向けに「hello world 級」の極小タスクにする。
# 1〜2テストで通り、AIエージェントの戦闘が数十秒で終わる粒度にそろえる。

create_issue "greet(name) で挨拶を返す" bug \
"## 期待
- \`greet('Sora') === 'Hello, Sora!'\`

## 対象
src/greet.ts（新規）。テストは test/greet.test.ts。"

create_issue "double(n) が n の2倍を返す" refactor \
"## 期待
- \`double(4) === 8\`

## 対象
src/calculator.ts に \`double\` を追加。"

create_issue "shout(text) を大文字にする" security \
"## 期待
- \`shout('hi') === 'HI!'\`

## 対象
src/shout.ts（新規）。"

echo "==> 完了"
