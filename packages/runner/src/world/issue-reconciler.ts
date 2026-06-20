import type { EnemyStatus } from '@github-issue-rpg/shared'

/**
 * issue定期ポーリングの差分反映（要件5.2）。
 * 新規 open issue → 敵追加、close（open一覧から消失）→ 敵撤去。
 * ポーリングのスケジュール自体は Runner 実体側で行い、本関数は純粋な差分計算を担う。
 */

export interface ExistingEnemy {
  id: number
  issueNumber: number
  status: EnemyStatus
}

export interface ReconcileResult {
  /** 敵として追加すべき issue番号。 */
  toAdd: number[]
  /** 撤去すべき敵ID（active のみ対象）。 */
  toRemove: number[]
}

/**
 * 既存の敵と現在の open issue 一覧から、追加/撤去の差分を求める。
 * - toAdd: open issue のうち既存の敵が存在しないもの（status不問で重複追加を防ぐ）
 * - toRemove: active な敵のうち open 一覧に無いもの（defeated/removed は対象外）
 */
export function reconcileEnemies(
  existing: readonly ExistingEnemy[],
  openIssueNumbers: readonly number[],
): ReconcileResult {
  const existingIssues = new Set(existing.map((enemy) => enemy.issueNumber))
  const openSet = new Set(openIssueNumbers)

  const toAdd = openIssueNumbers.filter((issueNumber) => !existingIssues.has(issueNumber))
  const toRemove = existing
    .filter((enemy) => enemy.status === 'active' && !openSet.has(enemy.issueNumber))
    .map((enemy) => enemy.id)

  return { toAdd, toRemove }
}
