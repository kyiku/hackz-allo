import { describe, expect, it } from 'vitest'
import { INITIAL_LOADOUT, loadoutSchema, loadoutTuningSchema } from './player'

describe('loadoutSchema', () => {
  it('容量と割り当てのフィールドを持つ', () => {
    const v = loadoutSchema.parse(INITIAL_LOADOUT)
    expect(v.mcpSlots).toBe(0)
    expect(v.partySlots).toBe(1)
    expect(v.modelTierMax).toBe(0)
    expect(v.enabledMcpRefs).toEqual([])
    expect(v.selectedModelTier).toBe(0)
    expect(v.partySize).toBe(1)
  })
  it('equippedIds は持たない', () => {
    expect('equippedIds' in INITIAL_LOADOUT).toBe(false)
  })
})

describe('loadoutTuningSchema', () => {
  it('modelTier を受け付ける', () => {
    expect(loadoutTuningSchema.parse({ modelTier: 2 }).modelTier).toBe(2)
  })
})
