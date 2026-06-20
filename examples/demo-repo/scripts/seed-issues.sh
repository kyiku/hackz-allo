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

create_issue "0除算でクラッシュする divide を安全にする" bug \
"## 概要
\`divide(a, b)\` が未実装で、0除算時の挙動も未定義。

## 期待
- \`divide(6, 3) === 2\`
- \`b === 0\` のとき例外を投げる（メッセージに 'division by zero' を含む）

## 対象
src/calculator.ts"

create_issue "calculator を演算種別で拡張可能にリファクタする" refactor \
"## 概要
add/subtract が個別関数で重複気味。\`calculate(op, a, b)\` に集約したい。

## 期待
- \`calculate('add', 2, 3) === 5\`
- \`calculate('sub', 5, 3) === 2\`
- 未知の op で例外

## 対象
src/calculator.ts"

create_issue "ユーザー入力の式評価でインジェクションを防ぐ" security \
"## 概要
文字列の式を評価する \`evalExpression\` が必要だが、eval は危険。

## 期待
- \`evalExpression('1 + 2') === 3\`
- 数値と + - * / と空白のみ許可。それ以外（英字・括弧・セミコロン等）は例外
- eval/Function を使わない安全な実装

## 対象
src/expression.ts（新規）"

echo "==> 完了"
