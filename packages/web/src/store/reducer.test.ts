import type { Enemy, ServerEvent, World } from '@github-issue-rpg/shared'
import { describe, expect, it } from 'vitest'
import { applyServerEvent, initialGameData, type GameData } from './reducer'

const world: World = {
  id: 1,
  repoOwner: 'kyiku',
  repoName: 'hackz-allo',
  repoUrl: 'https://github.com/kyiku/hackz-allo',
  createdAt: '2026-06-20T00:00:00.000Z',
}

const enemy: Enemy = {
  id: 10,
  worldId: 1,
  issueNumber: 42,
  title: 'バグの巣窟',
  hpTotal: 5,
  hpCurrent: 5,
  difficulty: 'normal',
  weakness: null,
  status: 'active',
}

function apply(events: ServerEvent[], from: GameData = initialGameData): GameData {
  return events.reduce(applyServerEvent, from)
}

describe('applyServerEvent', () => {
  it('world.state はワールドと敵辞書を置き換える', () => {
    const state = apply([{ type: 'world.state', world, enemies: [enemy] }])
    expect(state.world).toEqual(world)
    expect(state.enemies[10]).toEqual(enemy)
  })

  it('enemy.appeared / enemy.removed で敵を増減する', () => {
    const appeared = apply([{ type: 'enemy.appeared', enemy }])
    expect(appeared.enemies[10]).toEqual(enemy)
    const removed = apply([{ type: 'enemy.removed', enemyId: 10 }], appeared)
    expect(removed.enemies[10]).toBeUndefined()
  })

  it('battle.started で hpCurrent=hpTotal の戦闘を作る', () => {
    const state = apply([{ type: 'battle.started', battleId: 'b1', enemyId: 10, hpTotal: 5 }])
    expect(state.battles['b1']).toMatchObject({
      hpTotal: 5,
      hpCurrent: 5,
      status: 'fighting',
      logs: [],
    })
  })

  it('battle.hp_changed は HP を更新する', () => {
    const state = apply([
      { type: 'battle.started', battleId: 'b1', enemyId: 10, hpTotal: 5 },
      { type: 'battle.hp_changed', battleId: 'b1', hpCurrent: 3 },
    ])
    expect(state.battles['b1']?.hpCurrent).toBe(3)
  })

  it('未知の battle へのイベントは無視する（取りこぼし耐性）', () => {
    const state = apply([{ type: 'battle.hp_changed', battleId: 'ghost', hpCurrent: 1 }])
    expect(state.battles['ghost']).toBeUndefined()
  })

  it('battle.log はログ行を追記する', () => {
    const state = apply([
      { type: 'battle.started', battleId: 'b1', enemyId: 10, hpTotal: 5 },
      { type: 'battle.log', battleId: 'b1', line: '攻撃が命中', kind: 'attack' },
    ])
    expect(state.battles['b1']?.logs).toEqual([{ seq: 0, line: '攻撃が命中', kind: 'attack' }])
  })

  it('battle.log は追記ごとに seq を採番する（描画 key 用）', () => {
    const state = apply([
      { type: 'battle.started', battleId: 'b1', enemyId: 10, hpTotal: 5 },
      { type: 'battle.log', battleId: 'b1', line: '攻撃が命中', kind: 'attack' },
      { type: 'battle.log', battleId: 'b1', line: 'HPを回復', kind: 'heal' },
    ])
    expect(state.battles['b1']?.logs.map((log) => log.seq)).toEqual([0, 1])
  })

  it('battle.defeated で戦闘を撃破にし対応する敵も撃破扱いにする', () => {
    const state = apply([
      { type: 'enemy.appeared', enemy },
      { type: 'battle.started', battleId: 'b1', enemyId: 10, hpTotal: 5 },
      {
        type: 'battle.defeated',
        battleId: 'b1',
        enemyId: 10,
        reward: { kind: 'weapon', name: '黒曜のリンタ', description: 'null安全', abilityId: null },
      },
    ])
    expect(state.battles['b1']).toMatchObject({ status: 'defeated', hpCurrent: 0 })
    expect(state.battles['b1']?.reward?.name).toBe('黒曜のリンタ')
    expect(state.enemies[10]?.status).toBe('defeated')
  })

  it('battle.failed は理由を保持し状態を failed にする', () => {
    const state = apply([
      { type: 'battle.started', battleId: 'b1', enemyId: 10, hpTotal: 5 },
      { type: 'battle.failed', battleId: 'b1', reason: 'CI失敗' },
    ])
    expect(state.battles['b1']).toMatchObject({ status: 'failed', failureReason: 'CI失敗' })
  })

  it('player.status / world.assignments を投影する', () => {
    const state = apply([
      {
        type: 'player.status',
        player: { id: 1, level: 2, exp: 120 },
        loadout: { equippedIds: [1], partySize: 1 },
      },
      {
        type: 'world.assignments',
        assignments: [{ issueNumber: 42, enemyId: 10, battleId: 'b1', status: 'fighting' }],
      },
    ])
    expect(state.player).toMatchObject({ level: 2, exp: 120 })
    expect(state.loadout?.equippedIds).toEqual([1])
    expect(state.assignments).toHaveLength(1)
  })

  it('tavern.issueDraft で issue 案を保持する', () => {
    const draft = { title: 'NPEを直す', body: 'null安全に', labels: ['bug'] }
    const state = apply([{ type: 'tavern.issueDraft', draft }])
    expect(state.tavernDraft).toEqual(draft)
  })

  it('元の状態を破壊しない（イミュータブル）', () => {
    const before = apply([{ type: 'enemy.appeared', enemy }])
    apply([{ type: 'enemy.removed', enemyId: 10 }], before)
    expect(before.enemies[10]).toEqual(enemy)
  })
})
