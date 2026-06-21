// loadout-effects.test.ts
import { describe, expect, it } from 'vitest'
import { INITIAL_LOADOUT, type Loadout } from './player'
import { applyEffects } from './loadout-effects'

describe('applyEffects', () => {
  it('+1カードで容量が増える', () => {
    const r = applyEffects(INITIAL_LOADOUT, ['eff.mcp.up', 'eff.party.up', 'eff.model.up'])
    expect(r.mcpSlots).toBe(1)
    expect(r.partySlots).toBe(2)
    expect(r.modelTierMax).toBe(1)
  })
  it('-1カードでも下限を割らない（mcp≥0, party≥1, model≥0）', () => {
    const r = applyEffects(INITIAL_LOADOUT, ['eff.mcp.down', 'eff.party.down', 'eff.model.down'])
    expect(r.mcpSlots).toBe(0)
    expect(r.partySlots).toBe(1)
    expect(r.modelTierMax).toBe(0)
  })
  it('容量が減ると割り当てを切り詰める', () => {
    const base: Loadout = {
      ...INITIAL_LOADOUT,
      mcpSlots: 2, enabledMcpRefs: ['github', 'context7'],
      partySlots: 3, partySize: 3,
      modelTierMax: 3, selectedModelTier: 3,
    }
    const r = applyEffects(base, ['eff.mcp.down', 'eff.party.down', 'eff.model.down'])
    expect(r.mcpSlots).toBe(1)
    expect(r.enabledMcpRefs).toEqual(['github']) // 末尾を削る
    expect(r.partySlots).toBe(2)
    expect(r.partySize).toBe(2) // 上限へ寄せる
    expect(r.modelTierMax).toBe(2)
    expect(r.selectedModelTier).toBe(2)
  })
  it('未登録effectIdは無視', () => {
    expect(applyEffects(INITIAL_LOADOUT, ['eff.bogus']).mcpSlots).toBe(0)
  })
  it('元オブジェクトを変更しない', () => {
    const r = applyEffects(INITIAL_LOADOUT, ['eff.mcp.up'])
    expect(INITIAL_LOADOUT.mcpSlots).toBe(0)
    expect(r).not.toBe(INITIAL_LOADOUT)
  })
})
