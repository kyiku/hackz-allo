import { describe, expect, it } from 'vitest'
import { ABILITY_CATALOG, abilitySchema, getAbility, mcpPool, mcpRefs } from './ability-catalog'

describe('ABILITY_CATALOG', () => {
  it('MVPの3能力を持つ', () => {
    expect(ABILITY_CATALOG).toHaveLength(3)
  })

  it('全エントリがスキーマに適合する', () => {
    for (const ability of ABILITY_CATALOG) {
      expect(() => abilitySchema.parse(ability)).not.toThrow()
    }
  })

  it('skill/mcp/plugin の3種別を網羅する', () => {
    const kinds = ABILITY_CATALOG.map((a) => a.kind).sort()
    expect(kinds).toEqual(['mcp', 'plugin', 'skill'])
  })

  it('ability_id は一意', () => {
    const ids = ABILITY_CATALOG.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('getAbility', () => {
  it('idで能力を取得できる', () => {
    const first = ABILITY_CATALOG[0]!
    expect(getAbility(first.id)).toEqual(first)
  })

  it('未知のidは undefined', () => {
    expect(getAbility('ability.unknown')).toBeUndefined()
  })
})

describe('mcpPool', () => {
  it('mcp種別のみ返す', () => {
    expect(mcpPool().every((a) => a.kind === 'mcp')).toBe(true)
    expect(mcpRefs()).toContain('github')
    expect(mcpRefs()).toContain('context7')
  })
})
