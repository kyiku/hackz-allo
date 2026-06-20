import type { Difficulty } from '@github-issue-rpg/shared'

/**
 * 敵（issueの化身）の表示名（タスク#117拡張）。
 * 見た目スプライトに合わせた「種族名」＋ issue番号から決定的に選ぶ「個体名」で
 * 「ゴースト・ガラク」のように名乗らせる。issue番号/タイトルは別途併記する想定。
 */

/** 難易度→種族名（スプライトの見た目準拠）。 */
const SPECIES: Record<Difficulty, string> = {
  easy: 'スライム',
  normal: 'クラブ',
  hard: 'ゴースト',
  boss: 'スパイダー',
}

/** 個体名の素（issue番号で決定的に選ぶ）。 */
const GIVEN_NAMES = [
  'ガラク',
  'モルド',
  'ヴェル',
  'ノクス',
  'ザル',
  'ジン',
  'ドルク',
  'グレン',
  'リズ',
  'ヴァロ',
  'オルガ',
  'ボルグ',
  'ネル',
  'カイン',
  'ゾラ',
  'ファング',
] as const

/** 難易度に対応する種族名を返す。 */
export function enemySpecies(difficulty: Difficulty): string {
  return SPECIES[difficulty]
}

/** issue番号から決定的に選ぶ個体名。 */
export function enemyGivenName(issueNumber: number): string {
  const len = GIVEN_NAMES.length
  const index = ((Math.trunc(issueNumber) % len) + len) % len
  return GIVEN_NAMES[index] ?? GIVEN_NAMES[0]
}

/** 種族名＋個体名（例: 「ゴースト・ガラク」）。 */
export function enemyName(difficulty: Difficulty, issueNumber: number): string {
  return `${enemySpecies(difficulty)}・${enemyGivenName(issueNumber)}`
}
