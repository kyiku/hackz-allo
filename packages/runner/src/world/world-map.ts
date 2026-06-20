/**
 * ワールド/マップ生成（要件5.2）。
 * 1 repo = 1 World、1 issue = 1 敵。固定テンプレのグリッドに issue番号シードで決定的に配置する。
 */

export interface GridConfig {
  cols: number
  rows: number
}

export interface Cell {
  x: number
  y: number
}

export interface EnemyPlacement extends Cell {
  issueNumber: number
}

// Knuth 乗算ハッシュ用の定数（決定的なシード分散）。
const HASH_MULTIPLIER = 2654435761

/** issue番号からグリッド内の優先セルを決定的に求める。 */
export function seededCell(issueNumber: number, grid: GridConfig): Cell {
  const total = grid.cols * grid.rows
  const index = (issueNumber * HASH_MULTIPLIER) % total
  return { x: index % grid.cols, y: Math.floor(index / grid.cols) }
}

/**
 * issue 群をグリッドに配置する。
 * issue番号で安定ソートし、優先セルから線形プロービングで衝突を回避する。
 * セル数を超える場合は例外。
 */
export function placeEnemies(issueNumbers: readonly number[], grid: GridConfig): EnemyPlacement[] {
  const total = grid.cols * grid.rows
  if (issueNumbers.length > total) {
    throw new Error(`配置数(${issueNumbers.length})がグリッドのセル数(${total})を超えています。`)
  }

  const occupied = new Set<number>()
  const sorted = [...issueNumbers].sort((a, b) => a - b)
  const placements: EnemyPlacement[] = []

  for (const issueNumber of sorted) {
    const start = (issueNumber * HASH_MULTIPLIER) % total
    let index = start
    while (occupied.has(index)) {
      index = (index + 1) % total
    }
    occupied.add(index)
    placements.push({ issueNumber, x: index % grid.cols, y: Math.floor(index / grid.cols) })
  }

  return placements
}
