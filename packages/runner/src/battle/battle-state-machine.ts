import type { BattleStatus } from '@github-issue-rpg/shared'

/**
 * 戦闘状態機械（要件5.4, 5.6）。
 * 出現(appeared)→RED(red)→戦闘中(fighting)→詰め(closing)→撃破(defeated)/失敗(failed)。
 */

export type BattleEvent = 'red_confirmed' | 'engage' | 'enter_closing' | 'defeat' | 'fail' | 'retry'

const TRANSITIONS: Record<BattleStatus, Partial<Record<BattleEvent, BattleStatus>>> = {
  appeared: { red_confirmed: 'red' },
  red: { engage: 'fighting' },
  fighting: { enter_closing: 'closing', defeat: 'defeated', fail: 'failed' },
  closing: { defeat: 'defeated', fail: 'failed' },
  failed: { retry: 'fighting' },
  defeated: {},
}

/** 状態遷移を行う。不正な遷移は例外。 */
export function battleTransition(state: BattleStatus, event: BattleEvent): BattleStatus {
  const next = TRANSITIONS[state][event]
  if (!next) {
    throw new Error(`不正な戦闘状態遷移: ${state} -(${event})-> ?`)
  }
  return next
}

/** 終端状態か（撃破のみ終端。失敗は再戦可能なため非終端）。 */
export function isTerminal(state: BattleStatus): boolean {
  return state === 'defeated'
}

/** 詰め(closing)に入るHP割合の閾値。 */
const CLOSING_THRESHOLD = 0.25

/**
 * HP残量から戦闘ステータスを導く。
 * HP0→defeated、残量が閾値以下→closing、それ以外→現状維持。
 */
export function deriveStatusFromHp(current: BattleStatus, hpCurrent: number, hpTotal: number): BattleStatus {
  if (hpCurrent <= 0) {
    return 'defeated'
  }
  if (hpTotal > 0 && hpCurrent / hpTotal <= CLOSING_THRESHOLD) {
    return 'closing'
  }
  return current
}
