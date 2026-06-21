import { describe, expect, it } from 'vitest'
import { buildPartyAgentDefinitions } from './party-agents'

describe('buildPartyAgentDefinitions', () => {
  it('partySize=1 では仲間なし（空）', () => {
    expect(Object.keys(buildPartyAgentDefinitions(1))).toHaveLength(0)
  })
  it('partySize=3 で2体、AgentDefinition形（description/prompt）を持つ', () => {
    const agents = buildPartyAgentDefinitions(3)
    expect(Object.keys(agents)).toHaveLength(2)
    const first = Object.values(agents)[0]
    expect(typeof first.description).toBe('string')
    expect(typeof first.prompt).toBe('string')
  })
})
