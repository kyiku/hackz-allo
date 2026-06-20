import { describe, expect, it } from 'vitest'
import { parseServerEvent } from '@github-issue-rpg/shared'
import { buildAgentOptions, buildAssignmentsEvent, buildPlayerStatusEvent } from './projection'

const player = { id: 1, level: 3, exp: 250 }
const loadout = { equippedIds: [10, 20], partySize: 2 }

describe('buildPlayerStatusEvent', () => {
  it('player.status イベントを生成する（装備コレクション込み）', () => {
    const equipment = [{ id: 10, kind: 'weapon' as const, name: '黒曜のリンタ', abilityId: null }]
    const event = buildPlayerStatusEvent(player, loadout, equipment)
    expect(parseServerEvent(event)).toMatchObject({
      type: 'player.status',
      player,
      loadout,
      equipment,
    })
  })

  it('装備省略時は空コレクションになる', () => {
    const event = buildPlayerStatusEvent(player, loadout)
    expect(parseServerEvent(event)).toMatchObject({ equipment: [] })
  })
})

describe('buildAssignmentsEvent', () => {
  it('world.assignments イベントを生成する', () => {
    const assignments = [
      { issueNumber: 42, enemyId: 1, battleId: 'b1', status: 'fighting' as const },
    ]
    const event = buildAssignmentsEvent(assignments)
    expect(parseServerEvent(event)).toMatchObject({ type: 'world.assignments', assignments })
  })
})

describe('buildAgentOptions', () => {
  it('装備中の能力IDとパーティ規模を返す', () => {
    const options = buildAgentOptions(loadout, { 10: 'mcp:github', 20: 'skill:tdd' })
    expect(options.abilityIds).toEqual(['mcp:github', 'skill:tdd'])
    expect(options.partySize).toBe(2)
  })

  it('カタログに無い装備IDは無視する', () => {
    const options = buildAgentOptions({ equippedIds: [10, 99], partySize: 1 }, { 10: 'mcp:github' })
    expect(options.abilityIds).toEqual(['mcp:github'])
  })
})
