import { describe, expect, it } from 'vitest'
import { createDatabase } from '../database'
import { createEquipmentRepository } from './equipment-repository'
import { createPlayerRepository } from './player-repository'

function setup() {
  const db = createDatabase(':memory:')
  const player = createPlayerRepository(db).create()
  return { repo: createEquipmentRepository(db), playerId: player.id }
}

const reward = { kind: 'weapon' as const, name: '炎の剣', description: '攻撃UP', abilityId: 'ability.github-mcp' }

describe('EquipmentRepository', () => {
  it('報酬から装備を作成し playerId で一覧取得できる', () => {
    const { repo, playerId } = setup()
    const eq = repo.createFromReward(playerId, reward, '2026-06-20T00:00:00.000Z')
    expect(eq.id).toBeGreaterThan(0)
    expect(eq.name).toBe('炎の剣')
    expect(eq.abilityId).toBe('ability.github-mcp')
    expect(repo.listByPlayer(playerId)).toHaveLength(1)
  })

  it('abilityId が null の装備も保存できる', () => {
    const { repo, playerId } = setup()
    const eq = repo.createFromReward(playerId, { ...reward, abilityId: null }, '2026-06-20T00:00:00.000Z')
    expect(eq.abilityId).toBeNull()
  })
})
