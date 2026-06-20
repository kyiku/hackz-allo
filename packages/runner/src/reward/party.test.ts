import { describe, expect, it } from 'vitest'
import { buildPartyAgents, delegationLogFromHook } from './party'

describe('buildPartyAgents', () => {
  it('party_size 1 はサブエージェント無し（ソロ）', () => {
    expect(buildPartyAgents(1)).toEqual([])
  })

  it('party_size に応じてサブエージェント定義が増える', () => {
    expect(buildPartyAgents(2)).toHaveLength(1)
    expect(buildPartyAgents(3)).toHaveLength(2)
  })

  it('定義は name と description を持つ', () => {
    const [agent] = buildPartyAgents(2)
    expect(agent?.name).toBeTruthy()
    expect(agent?.description).toBeTruthy()
  })

  it('ロール上限を超えても安全（重複なくキャップ）', () => {
    const agents = buildPartyAgents(99)
    const names = agents.map((a) => a.name)
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('delegationLogFromHook', () => {
  it('subagent開始を委譲ログにする', () => {
    const log = delegationLogFromHook({ type: 'subagent_start', name: 'reviewer' })
    expect(log?.kind).toBe('info')
    expect(log?.line).toContain('reviewer')
  })

  it('subagent終了も委譲ログにする', () => {
    expect(delegationLogFromHook({ type: 'subagent_stop', name: 'reviewer' })?.line).toContain('reviewer')
  })

  it('無関係なhookはnull', () => {
    expect(delegationLogFromHook({ type: 'other', name: 'x' })).toBeNull()
  })
})
