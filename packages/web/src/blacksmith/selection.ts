import type { BattleStatus, Enemy } from '@github-issue-rpg/shared'

/** 進行中（撃破/失敗で終わっていない）とみなす戦闘状態。 */
const ACTIVE_BATTLE_STATUSES: ReadonlySet<BattleStatus> = new Set<BattleStatus>([
  'appeared',
  'red',
  'fighting',
  'closing',
])

/** 戦闘が進行中か。 */
export function isBattleActive(status: BattleStatus): boolean {
  return ACTIVE_BATTLE_STATUSES.has(status)
}

export interface BattleLike {
  enemyId: number
  status: BattleStatus
}

/**
 * 鍛冶屋に依頼可能な敵（issue）を返す。
 * 条件: 敵が active かつ、その敵に対する進行中の戦闘が無いこと。
 * 並びは issue 番号の昇順で安定させる。
 */
export function forgeableEnemies(
  enemies: readonly Enemy[],
  battles: readonly BattleLike[],
): Enemy[] {
  const busyEnemyIds = new Set(
    battles.filter((battle) => isBattleActive(battle.status)).map((battle) => battle.enemyId),
  )
  return enemies
    .filter((enemy) => enemy.status === 'active' && !busyEnemyIds.has(enemy.id))
    .sort((a, b) => a.issueNumber - b.issueNumber)
}
