import { describe, expect, it } from 'vitest'
import { buildAbilityInjection } from './ability-injection'

describe('buildAbilityInjection', () => {
  it('カタログ種別ごとに mcpServers/skills/plugins へ振り分ける', () => {
    const inj = buildAbilityInjection(['ability.github-mcp', 'ability.tdd-skill', 'ability.refactor-plugin'])
    expect(inj.mcpServers).toEqual(['github'])
    expect(inj.skills).toEqual(['tdd'])
    expect(inj.plugins).toEqual(['refactor-cleaner'])
  })

  it('未登録のabilityIdは無視する', () => {
    const inj = buildAbilityInjection(['ability.github-mcp', 'ability.bogus'])
    expect(inj.mcpServers).toEqual(['github'])
    expect(inj.skills).toEqual([])
  })

  it('装備で次戦の挙動が変わる: mcp装備でmcpServersが増える', () => {
    expect(buildAbilityInjection([]).mcpServers).toEqual([])
    expect(buildAbilityInjection(['ability.github-mcp']).mcpServers.length).toBe(1)
  })
})
