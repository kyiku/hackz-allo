/**
 * EXP/レベル算出（要件5.8）。累積EXP 100ごとに1レベル（Lv1始まり）。
 */

const EXP_PER_LEVEL = 100

/** 累積EXPからレベルを求める。 */
export function levelForExp(totalExp: number): number {
  return Math.floor(totalExp / EXP_PER_LEVEL) + 1
}

export interface PlayerProgress {
  level: number
  exp: number
}

export interface ExpGainResult extends PlayerProgress {
  leveledUp: boolean
}

/** EXPを加算し、レベルを再計算する。 */
export function applyExpGain(current: PlayerProgress, amount: number): ExpGainResult {
  const exp = current.exp + amount
  const level = levelForExp(exp)
  return { level, exp, leveledUp: level > current.level }
}
