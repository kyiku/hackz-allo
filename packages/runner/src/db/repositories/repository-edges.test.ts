import { describe, expect, it } from 'vitest'
import { createDatabase } from '../database'
import { createWorldRepository } from './world-repository'
import { createEnemyRepository } from './enemy-repository'
import { createPlayerRepository } from './player-repository'
import { createLoadoutRepository } from './loadout-repository'
import { createEquipmentRepository } from './equipment-repository'

const createdAt = '2026-06-20T00:00:00.000Z'

function world(db: ReturnType<typeof createDatabase>) {
  return createWorldRepository(db).create({ repoOwner: 'k', repoName: 'r', repoUrl: 'https://github.com/k/r', createdAt })
}

describe('WorldRepository edges', () => {
  it('listAll は作成順に全件返す / findByRepo 未存在は null', () => {
    const db = createDatabase(':memory:')
    const repo = createWorldRepository(db)
    repo.create({ repoOwner: 'a', repoName: 'x', repoUrl: 'https://github.com/a/x', createdAt })
    repo.create({ repoOwner: 'b', repoName: 'y', repoUrl: 'https://github.com/b/y', createdAt })
    expect(repo.listAll()).toHaveLength(2)
    expect(repo.findByRepo('none', 'none')).toBeNull()
  })
})

describe('EnemyRepository edges', () => {
  it('存在しないIDの更新は例外 / findById 未存在は null', () => {
    const db = createDatabase(':memory:')
    const enemies = createEnemyRepository(db)
    expect(enemies.findById(999)).toBeNull()
    expect(() => enemies.updateHp(999, 0)).toThrow()
    expect(() => enemies.updateStatus(999, 'defeated')).toThrow()
    // world作成後の正常更新も確認
    const w = world(db)
    const e = enemies.create({ worldId: w.id, issueNumber: 1, title: 't', hpTotal: 3, hpCurrent: 3, difficulty: 'normal', weakness: null, status: 'active' })
    expect(enemies.updateStatus(e.id, 'removed').status).toBe('removed')
  })
})

describe('PlayerRepository edges', () => {
  it('存在しないIDの更新は例外 / findById 未存在は null', () => {
    const players = createPlayerRepository(createDatabase(':memory:'))
    expect(players.findById(999)).toBeNull()
    expect(() => players.setLevel(999, 5)).toThrow()
  })
})

describe('LoadoutRepository edges', () => {
  it('未作成プレイヤーの update は例外', () => {
    const db = createDatabase(':memory:')
    const player = createPlayerRepository(db).create()
    const loadouts = createLoadoutRepository(db)
    expect(() => loadouts.update(player.id, { equippedIds: [1], partySize: 2 })).toThrow()
  })
})

describe('EquipmentRepository edges', () => {
  it('装備が無ければ空配列', () => {
    const db = createDatabase(':memory:')
    const player = createPlayerRepository(db).create()
    expect(createEquipmentRepository(db).listByPlayer(player.id)).toEqual([])
  })
})
