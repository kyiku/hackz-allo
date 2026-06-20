import { describe, expect, it } from 'vitest'
import { placeEnemies, seededCell } from './world-map'

const grid = { cols: 8, rows: 8 }

describe('seededCell', () => {
  it('同じ issue番号は同じセルを返す（決定的）', () => {
    expect(seededCell(42, grid)).toEqual(seededCell(42, grid))
  })

  it('セルはグリッド範囲内', () => {
    const cell = seededCell(123, grid)
    expect(cell.x).toBeGreaterThanOrEqual(0)
    expect(cell.x).toBeLessThan(grid.cols)
    expect(cell.y).toBeGreaterThanOrEqual(0)
    expect(cell.y).toBeLessThan(grid.rows)
  })
})

describe('placeEnemies', () => {
  it('全 issue を配置し、セルの重複が無い', () => {
    const placements = placeEnemies([1, 2, 3, 42, 100], grid)
    expect(placements).toHaveLength(5)
    const keys = placements.map((p) => `${p.x},${p.y}`)
    expect(new Set(keys).size).toBe(5)
  })

  it('決定的（同じ入力→同じ配置）', () => {
    expect(placeEnemies([1, 2, 3], grid)).toEqual(placeEnemies([1, 2, 3], grid))
  })

  it('入力順に依存せず issue番号で安定する', () => {
    const a = placeEnemies([3, 1, 2], grid)
    const b = placeEnemies([1, 2, 3], grid)
    const find = (list: typeof a, n: number) => list.find((p) => p.issueNumber === n)
    expect(find(a, 1)).toEqual(find(b, 1))
  })

  it('セル数を超える配置はエラー', () => {
    expect(() => placeEnemies([1, 2, 3, 4, 5], { cols: 2, rows: 2 })).toThrow()
  })
})
