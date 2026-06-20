import { describe, expect, it } from 'vitest'
import { parseClientEvent, parseServerEvent } from './ws-events'

const enemy = {
  id: 1,
  worldId: 1,
  issueNumber: 42,
  title: 'バグの巣窟',
  hpTotal: 5,
  hpCurrent: 5,
  difficulty: 'normal',
  weakness: null,
  status: 'active',
}

describe('parseServerEvent', () => {
  it('battle.hp_changed をパースする', () => {
    const event = { type: 'battle.hp_changed', battleId: 'b1', hpCurrent: 3 }
    expect(parseServerEvent(event)).toEqual(event)
  })

  it('enemy.appeared の入れ子のenemyを検証する', () => {
    const event = { type: 'enemy.appeared', enemy }
    expect(parseServerEvent(event)).toEqual(event)
  })

  it('入れ子のenemyが不正なら拒否する', () => {
    const event = { type: 'enemy.appeared', enemy: { ...enemy, status: 'bogus' } }
    expect(() => parseServerEvent(event)).toThrow()
  })

  it('未知のtypeを拒否する', () => {
    expect(() => parseServerEvent({ type: 'unknown.event' })).toThrow()
  })

  it('クライアント方向のイベントはサーバーイベントとして拒否する', () => {
    expect(() => parseServerEvent({ type: 'cmd.forge', issueNumber: 1 })).toThrow()
  })

  it('tavern.issueDraft をパースする', () => {
    const event = {
      type: 'tavern.issueDraft',
      draft: { title: 'NPEを直す', body: 'null安全に', labels: ['bug'] },
    }
    expect(parseServerEvent(event)).toEqual(event)
  })

  it('tavern.issueDraft の title が空なら拒否する', () => {
    const event = {
      type: 'tavern.issueDraft',
      draft: { title: '', body: '', labels: [] },
    }
    expect(() => parseServerEvent(event)).toThrow()
  })
})

describe('parseClientEvent', () => {
  it('cmd.forge をパースする', () => {
    const event = { type: 'cmd.forge', issueNumber: 42 }
    expect(parseClientEvent(event)).toEqual(event)
  })

  it('spell.cast をパースする', () => {
    const event = { type: 'spell.cast', battleId: 'b1', message: 'null をチェックして' }
    expect(parseClientEvent(event)).toEqual(event)
  })

  it('issueNumberが数値でなければ拒否する', () => {
    expect(() => parseClientEvent({ type: 'cmd.forge', issueNumber: 'x' })).toThrow()
  })

  it('cmd.tavern.publish をパースする', () => {
    const event = {
      type: 'cmd.tavern.publish',
      draft: { title: 'リファクタ', body: '整理する', labels: ['refactor'] },
    }
    expect(parseClientEvent(event)).toEqual(event)
  })
})
