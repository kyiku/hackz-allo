import { describe, expect, it } from 'vitest'
import { INITIAL_LOADOUT, parseServerEvent } from '@github-issue-rpg/shared'
import { buildAssignmentsEvent, buildPlayerStatusEvent } from './projection'

const player = { id: 1, level: 3, exp: 250 }
const loadout = INITIAL_LOADOUT

describe('buildPlayerStatusEvent', () => {
  it('player.status イベントを生成する', () => {
    const event = buildPlayerStatusEvent(player, loadout)
    expect(parseServerEvent(event)).toMatchObject({
      type: 'player.status',
      player,
      loadout,
    })
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
