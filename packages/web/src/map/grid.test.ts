import { describe, expect, it } from 'vitest'
import {
  cellKey,
  enemyAtCell,
  GRID,
  placeEnemies,
  PLAYER_START,
  RESERVED_CELLS,
  seedIndex,
  step,
  type Cell,
  type PlaceableEnemy,
} from './grid'

describe('seedIndex', () => {
  it('範囲 [0, total) に収まる', () => {
    for (const n of [1, 42, 9999, 3_400_000, 2_147_483_647]) {
      const index = seedIndex(n, 96)
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(96)
    }
  })

  it('同一入力で決定的', () => {
    expect(seedIndex(42, 96)).toBe(seedIndex(42, 96))
  })

  it('total=0 でも例外を投げない', () => {
    expect(seedIndex(42, 0)).toBe(0)
  })
})

describe('placeEnemies', () => {
  const enemies: PlaceableEnemy[] = [
    { id: 1, issueNumber: 7 },
    { id: 2, issueNumber: 42 },
    { id: 3, issueNumber: 100 },
  ]

  it('全敵を配置する', () => {
    const placed = placeEnemies(enemies)
    expect(placed.size).toBe(3)
  })

  it('決定的（同一入力→同一配置）', () => {
    const a = placeEnemies(enemies)
    const b = placeEnemies(enemies)
    for (const enemy of enemies) {
      expect(b.get(enemy.id)).toEqual(a.get(enemy.id))
    }
  })

  it('敵同士が衝突しない', () => {
    // 多数の敵を詰めても1セル1体を保つ。
    const many: PlaceableEnemy[] = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      issueNumber: i + 1,
    }))
    const placed = placeEnemies(many)
    const keys = new Set([...placed.values()].map(cellKey))
    expect(keys.size).toBe(placed.size)
  })

  it('予約セル（プレイヤー初期位置/ランドマーク）を避ける', () => {
    const many: PlaceableEnemy[] = Array.from({ length: 60 }, (_, i) => ({
      id: i + 1,
      issueNumber: i + 1,
    }))
    const placed = placeEnemies(many)
    for (const cell of placed.values()) {
      expect(RESERVED_CELLS.has(cellKey(cell))).toBe(false)
    }
  })

  it('盤面に収まる', () => {
    const placed = placeEnemies(enemies)
    for (const cell of placed.values()) {
      expect(cell.x).toBeGreaterThanOrEqual(0)
      expect(cell.x).toBeLessThan(GRID.cols)
      expect(cell.y).toBeGreaterThanOrEqual(0)
      expect(cell.y).toBeLessThan(GRID.rows)
    }
  })

  it('重複issue番号は1体に正規化する', () => {
    const dup: PlaceableEnemy[] = [
      { id: 1, issueNumber: 7 },
      { id: 2, issueNumber: 7 },
    ]
    const placed = placeEnemies(dup)
    expect(placed.size).toBe(1)
  })
})

describe('step', () => {
  it('各方向へ1マス進む', () => {
    const pos: Cell = { x: 5, y: 5 }
    expect(step(pos, 'up')).toEqual({ x: 5, y: 4 })
    expect(step(pos, 'down')).toEqual({ x: 5, y: 6 })
    expect(step(pos, 'left')).toEqual({ x: 4, y: 5 })
    expect(step(pos, 'right')).toEqual({ x: 6, y: 5 })
  })

  it('盤面外へは進まず現在位置を維持する', () => {
    expect(step({ x: 0, y: 0 }, 'up')).toEqual({ x: 0, y: 0 })
    expect(step({ x: 0, y: 0 }, 'left')).toEqual({ x: 0, y: 0 })
    expect(step({ x: GRID.cols - 1, y: GRID.rows - 1 }, 'right')).toEqual({
      x: GRID.cols - 1,
      y: GRID.rows - 1,
    })
  })

  it('blockedセルへは進まない', () => {
    const blocked = new Set([cellKey({ x: 1, y: 0 })])
    expect(step(PLAYER_START, 'right', GRID, blocked)).toEqual(PLAYER_START)
  })
})

describe('enemyAtCell', () => {
  it('セルに居る敵IDを返す', () => {
    const placements = new Map<number, Cell>([
      [10, { x: 3, y: 4 }],
      [20, { x: 5, y: 6 }],
    ])
    expect(enemyAtCell({ x: 5, y: 6 }, placements)).toBe(20)
  })

  it('居なければ null', () => {
    const placements = new Map<number, Cell>([[10, { x: 3, y: 4 }]])
    expect(enemyAtCell({ x: 0, y: 0 }, placements)).toBeNull()
  })
})
