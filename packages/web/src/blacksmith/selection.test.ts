import type { Enemy } from '@github-issue-rpg/shared'
import { describe, expect, it } from 'vitest'
import { forgeableEnemies, isBattleActive, type BattleLike } from './selection'

function enemy(overrides: Partial<Enemy> & Pick<Enemy, 'id' | 'issueNumber'>): Enemy {
  return {
    worldId: 1,
    title: `issue ${overrides.issueNumber}`,
    hpTotal: 3,
    hpCurrent: 3,
    difficulty: 'normal',
    weakness: null,
    status: 'active',
    ...overrides,
  }
}

describe('isBattleActive', () => {
  it('進行中状態を真と判定する', () => {
    expect(isBattleActive('fighting')).toBe(true)
    expect(isBattleActive('red')).toBe(true)
  })
  it('終了状態を偽と判定する', () => {
    expect(isBattleActive('defeated')).toBe(false)
    expect(isBattleActive('failed')).toBe(false)
  })
})

describe('forgeableEnemies', () => {
  const enemies: Enemy[] = [
    enemy({ id: 1, issueNumber: 10 }),
    enemy({ id: 2, issueNumber: 5 }),
    enemy({ id: 3, issueNumber: 20, status: 'defeated' }),
  ]

  it('active な敵のみを issue 番号昇順で返す', () => {
    const result = forgeableEnemies(enemies, [])
    expect(result.map((e) => e.id)).toEqual([2, 1])
  })

  it('進行中の戦闘がある敵は除外する', () => {
    const battles: BattleLike[] = [{ enemyId: 1, status: 'fighting' }]
    const result = forgeableEnemies(enemies, battles)
    expect(result.map((e) => e.id)).toEqual([2])
  })

  it('終了した戦闘の敵は依頼可能のまま', () => {
    const battles: BattleLike[] = [{ enemyId: 1, status: 'failed' }]
    const result = forgeableEnemies(enemies, battles)
    expect(result.map((e) => e.id)).toEqual([2, 1])
  })

  it('依頼可能な敵が無ければ空配列', () => {
    const result = forgeableEnemies([enemy({ id: 3, issueNumber: 20, status: 'defeated' })], [])
    expect(result).toEqual([])
  })
})
