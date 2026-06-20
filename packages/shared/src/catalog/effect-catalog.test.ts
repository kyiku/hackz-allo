import { describe, expect, it } from 'vitest'
import { EFFECT_CATALOG, getEffect } from './effect-catalog'

describe('EFFECT_CATALOG', () => {
  it('3軸×増減の6種を持つ', () => {
    expect(EFFECT_CATALOG).toHaveLength(6)
    expect(EFFECT_CATALOG.filter((e) => e.axis === 'mcp')).toHaveLength(2)
    expect(EFFECT_CATALOG.filter((e) => e.axis === 'party')).toHaveLength(2)
    expect(EFFECT_CATALOG.filter((e) => e.axis === 'model')).toHaveLength(2)
  })
  it('getEffectでidから取得、未登録はundefined', () => {
    expect(getEffect('eff.mcp.up')?.delta).toBe(1)
    expect(getEffect('eff.model.down')?.delta).toBe(-1)
    expect(getEffect('eff.bogus')).toBeUndefined()
  })
})
