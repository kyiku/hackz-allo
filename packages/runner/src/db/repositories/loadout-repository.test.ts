import { describe, expect, it } from 'vitest'
import { createDatabase } from '../database'
import { createLoadoutRepository } from './loadout-repository'
import { createPlayerRepository } from './player-repository'

function setup() {
  const db = createDatabase(':memory:')
  const player = createPlayerRepository(db).create()
  return { repo: createLoadoutRepository(db), playerId: player.id }
}

describe('LoadoutRepository', () => {
  it('プレイヤーの初期編成を作成する（空装備/パーティ1）', () => {
    const { repo, playerId } = setup()
    const loadout = repo.createForPlayer(playerId)
    expect(loadout.equippedIds).toEqual([])
    expect(loadout.partySize).toBe(1)
  })

  it('編成を更新できる（equippedIds は JSON 往復）', () => {
    const { repo, playerId } = setup()
    repo.createForPlayer(playerId)
    const updated = repo.update(playerId, { equippedIds: [1, 2], partySize: 3 })
    expect(updated.equippedIds).toEqual([1, 2])
    expect(updated.partySize).toBe(3)
    expect(repo.getByPlayer(playerId)?.partySize).toBe(3)
  })

  it('未作成なら getByPlayer は null', () => {
    const { repo } = setup()
    expect(repo.getByPlayer(999)).toBeNull()
  })
})
