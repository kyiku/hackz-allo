/**
 * マップのグリッド・敵配置・移動ロジック（純関数）。
 * Phaserに依存しないため単体テスト可能。描画は MapScene が本モジュールを利用する。
 * 設計: design.md §5（固定テンプレート＋issue番号シードで決定的配置、グリッド移動、敵接触で戦闘遷移）。
 */

/** グリッド寸法とタイルサイズ(px)。 */
export const GRID = { cols: 12, rows: 8, tile: 48 } as const

export interface Cell {
  x: number
  y: number
}

export type Direction = 'up' | 'down' | 'left' | 'right'

/** セルを集合キー("x,y")へ変換する。 */
export function cellKey(cell: Cell): string {
  return `${cell.x},${cell.y}`
}

/** プレイヤーの初期位置。 */
export const PLAYER_START: Cell = { x: 0, y: 0 }

/** 鍛冶屋・酒場の固定ランドマーク（敵は配置しない）。 */
export const LANDMARKS = {
  blacksmith: { x: GRID.cols - 1, y: GRID.rows - 1 },
  tavern: { x: GRID.cols - 1, y: 0 },
} as const

/** 敵を置かない予約セル（プレイヤー初期位置＋ランドマーク）。 */
export const RESERVED_CELLS: ReadonlySet<string> = new Set([
  cellKey(PLAYER_START),
  cellKey(LANDMARKS.blacksmith),
  cellKey(LANDMARKS.tavern),
])

export interface GridConfig {
  cols: number
  rows: number
  /** 配置不可セル("x,y")。 */
  blocked?: ReadonlySet<string>
}

// Knuth乗算ハッシュ。Math.imul で 32bit に収め、大きな issue 番号でも決定性を保つ。
const HASH_MULTIPLIER = 2654435761

/** issue番号を [0, total) のセルインデックスへ決定的に写像する。 */
export function seedIndex(issueNumber: number, total: number): number {
  if (total <= 0) return 0
  const hashed = Math.imul(issueNumber, HASH_MULTIPLIER) >>> 0
  return hashed % total
}

function indexToCell(index: number, cols: number): Cell {
  return { x: index % cols, y: Math.floor(index / cols) }
}

export interface PlaceableEnemy {
  id: number
  issueNumber: number
}

/**
 * 敵を決定的にグリッド配置する。
 * issue番号をシードに初期セルを決め、衝突は線形プロービングで回避する。
 * 予約セル（プレイヤー初期位置/ランドマーク）と配置済みセルは避ける。
 * 同一入力に対して常に同じ結果を返す（issue番号昇順で安定化）。
 */
export function placeEnemies(
  enemies: readonly PlaceableEnemy[],
  grid: GridConfig = { ...GRID, blocked: RESERVED_CELLS },
): Map<number, Cell> {
  const total = grid.cols * grid.rows
  const occupied = new Set<string>(grid.blocked ?? [])
  const result = new Map<number, Cell>()
  // 重複issue番号を除去しつつ、決定性のため issueNumber 昇順で処理する。
  const seen = new Set<number>()
  const sorted = [...enemies]
    .filter((enemy) => {
      if (seen.has(enemy.issueNumber)) return false
      seen.add(enemy.issueNumber)
      return true
    })
    .sort((a, b) => a.issueNumber - b.issueNumber)

  for (const enemy of sorted) {
    let index = seedIndex(enemy.issueNumber, total)
    for (let probe = 0; probe < total; probe++) {
      const cell = indexToCell(index, grid.cols)
      const key = cellKey(cell)
      if (!occupied.has(key)) {
        occupied.add(key)
        result.set(enemy.id, cell)
        break
      }
      index = (index + 1) % total
    }
  }
  return result
}

const DELTA: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

export interface Bounds {
  cols: number
  rows: number
}

/**
 * dir方向に1マス移動した結果セルを返す。
 * 盤面外・blockedセルへは進めず、現在位置を維持する。
 */
export function step(
  pos: Cell,
  dir: Direction,
  bounds: Bounds = GRID,
  blocked?: ReadonlySet<string>,
): Cell {
  const delta = DELTA[dir]
  const next: Cell = { x: pos.x + delta.x, y: pos.y + delta.y }
  if (next.x < 0 || next.y < 0 || next.x >= bounds.cols || next.y >= bounds.rows) {
    return pos
  }
  if (blocked?.has(cellKey(next))) {
    return pos
  }
  return next
}

/** 指定セルに居る敵のenemyIdを返す（配置の逆引き）。居なければ null。 */
export function enemyAtCell(cell: Cell, placements: ReadonlyMap<number, Cell>): number | null {
  for (const [id, placed] of placements) {
    if (placed.x === cell.x && placed.y === cell.y) return id
  }
  return null
}
