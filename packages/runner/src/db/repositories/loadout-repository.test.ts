import { INITIAL_LOADOUT } from '@github-issue-rpg/shared'
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
  it('プレイヤーの初期編成を作成する（INITIAL_LOADOUT 準拠）', () => {
    const { repo, playerId } = setup()
    const loadout = repo.createForPlayer(playerId)
    expect(loadout).toEqual(INITIAL_LOADOUT)
  })

  it('拡張フィールドを保存・取得できる', () => {
    const { repo, playerId } = setup()
    repo.createForPlayer(playerId)
    const updated = repo.update(playerId, {
      partySize: 2,
      mcpSlots: 2,
      partySlots: 3,
      modelTierMax: 2,
      enabledMcpRefs: ['github'],
      selectedModelTier: 1,
    })
    expect(updated.mcpSlots).toBe(2)
    expect(updated.enabledMcpRefs).toEqual(['github'])
    expect(repo.getByPlayer(playerId)?.selectedModelTier).toBe(1)
  })

  it('未作成なら getByPlayer は null', () => {
    const { repo } = setup()
    expect(repo.getByPlayer(999)).toBeNull()
  })

  it('未作成のプレイヤーを update するとエラー', () => {
    const { repo } = setup()
    expect(() => repo.update(999, INITIAL_LOADOUT)).toThrow(/Loadout not found/)
  })
})
