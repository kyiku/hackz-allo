import { describe, expect, it } from 'vitest'
import { clientEventSchema } from './client-events'

describe('client events', () => {
  it('cmd.reward.claim は effectIds を持つ', () => {
    const e = clientEventSchema.parse({ type: 'cmd.reward.claim', effectIds: ['eff.mcp.up'] })
    expect(e).toMatchObject({ type: 'cmd.reward.claim', effectIds: ['eff.mcp.up'] })
  })
  it('cmd.loadout.mcp は refs を持つ', () => {
    expect(clientEventSchema.parse({ type: 'cmd.loadout.mcp', refs: ['github'] })).toMatchObject({
      type: 'cmd.loadout.mcp', refs: ['github'],
    })
  })
})
