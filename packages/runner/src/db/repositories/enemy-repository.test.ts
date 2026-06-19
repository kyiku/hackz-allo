import { describe, expect, it } from 'vitest'
import { createDatabase } from '../database'
import { createEnemyRepository } from './enemy-repository'
import { createWorldRepository } from './world-repository'

function setup() {
  const db = createDatabase(':memory:')
  const worlds = createWorldRepository(db)
  const world = worlds.create({
    repoOwner: 'kyiku',
    repoName: 'hackz-allo',
    repoUrl: 'https://github.com/kyiku/hackz-allo',
    createdAt: '2026-06-20T00:00:00.000Z',
  })
  return { enemies: createEnemyRepository(db), worldId: world.id }
}

function enemyInput(worldId: number) {
  return {
    worldId,
    issueNumber: 42,
    title: 'バグの巣窟',
    hpTotal: 5,
    hpCurrent: 5,
    difficulty: 'normal' as const,
    weakness: null,
    status: 'active' as const,
  }
}

describe('EnemyRepository', () => {
  it('敵を作成しidを採番する', () => {
    const { enemies, worldId } = setup()
    const enemy = enemies.create(enemyInput(worldId))
    expect(enemy.id).toBeGreaterThan(0)
    expect(enemy.hpCurrent).toBe(5)
  })

  it('worldIdで一覧取得できる', () => {
    const { enemies, worldId } = setup()
    enemies.create(enemyInput(worldId))
    enemies.create({ ...enemyInput(worldId), issueNumber: 43 })
    expect(enemies.listByWorld(worldId)).toHaveLength(2)
  })

  it('HPを更新しても元オブジェクトを変更しない（イミュータブル）', () => {
    const { enemies, worldId } = setup()
    const enemy = enemies.create(enemyInput(worldId))
    const updated = enemies.updateHp(enemy.id, 3)
    expect(updated.hpCurrent).toBe(3)
    expect(enemy.hpCurrent).toBe(5)
  })

  it('状態を更新できる', () => {
    const { enemies, worldId } = setup()
    const enemy = enemies.create(enemyInput(worldId))
    expect(enemies.updateStatus(enemy.id, 'defeated').status).toBe('defeated')
  })
})
