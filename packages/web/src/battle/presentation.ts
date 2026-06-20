import type { BattleLogKind, BattleStatus } from '@github-issue-rpg/shared'

/** HP残量の割合(0..1)。total<=0 や範囲外は安全側にクランプする。 */
export function hpRatio(current: number, total: number): number {
  if (total <= 0) return 0
  return Math.max(0, Math.min(1, current / total))
}

const LOG_KIND_CLASS: Record<BattleLogKind, string> = {
  attack: 'text-rose-300',
  heal: 'text-emerald-300',
  spell: 'text-violet-300',
  system: 'text-slate-400',
  info: 'text-sky-300',
}

/** 戦闘ログの種別に対応するTailwind文字色クラス。 */
export function logKindClass(kind: BattleLogKind): string {
  return LOG_KIND_CLASS[kind]
}

const STATUS_LABEL: Record<BattleStatus, string> = {
  appeared: '出現',
  red: 'RED（テスト失敗を確認）',
  fighting: '戦闘中',
  closing: '詰め（PR/CI）',
  defeated: '撃破',
  failed: '失敗',
}

/** 戦闘状態の日本語ラベル。 */
export function battleStatusLabel(status: BattleStatus): string {
  return STATUS_LABEL[status]
}

/** 戦闘が継続中か（呪文送信・緊急停止を受け付けるか）。 */
export function isBattleActive(status: BattleStatus): boolean {
  return status !== 'defeated' && status !== 'failed'
}
