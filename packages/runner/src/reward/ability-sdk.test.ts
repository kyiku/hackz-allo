import { describe, expect, it } from 'vitest'
import type { McpServerConfig } from '@anthropic-ai/claude-agent-sdk'
import { buildAbilityInjection } from './ability-injection'
import { mcpRegistryFromEnv, resolveAbilitySdkOptions, resolveMcpServers } from './ability-sdk'

const REGISTRY: Record<string, McpServerConfig> = {
  github: { type: 'http', url: 'https://api.githubcopilot.com/mcp/' },
  context7: { type: 'stdio', command: 'npx', args: ['-y', '@upstash/context7-mcp'] },
}

describe('resolveAbilitySdkOptions', () => {
  it('登録済みのmcp refのみ実configとして注入し、未登録refは無視する', () => {
    // sqlite は REGISTRY 未登録なので落ちる
    const injection = buildAbilityInjection(['ability.github-mcp', 'ability.sqlite-mcp'])
    const opts = resolveAbilitySdkOptions(injection, REGISTRY)
    expect(opts.mcpServers).toEqual({ github: REGISTRY.github })
  })

  it('skill装備があれば settingSources(user) を立てる', () => {
    const opts = resolveAbilitySdkOptions(buildAbilityInjection(['ability.tdd-skill']), REGISTRY)
    expect(opts.settingSources).toEqual(['user'])
    expect(opts.mcpServers).toBeUndefined()
  })

  it('plugin装備でも settingSources を立てる', () => {
    const opts = resolveAbilitySdkOptions(buildAbilityInjection(['ability.refactor-plugin']), REGISTRY)
    expect(opts.settingSources).toEqual(['user'])
  })

  it('mcpとskillの併用: 両方が解決される', () => {
    const injection = buildAbilityInjection(['ability.context7-mcp', 'ability.security-skill'])
    const opts = resolveAbilitySdkOptions(injection, REGISTRY)
    expect(opts.mcpServers).toEqual({ context7: REGISTRY.context7 })
    expect(opts.settingSources).toEqual(['user'])
  })

  it('装備なしなら空オブジェクト（=従来挙動と同じ、何も注入しない）', () => {
    expect(resolveAbilitySdkOptions(buildAbilityInjection([]), REGISTRY)).toEqual({})
  })
})

describe('mcpRegistryFromEnv', () => {
  it('未設定なら空表', () => {
    expect(mcpRegistryFromEnv(undefined)).toEqual({})
  })

  it('正しいJSONを ref→config として読む', () => {
    const raw = JSON.stringify({ github: { type: 'http', url: 'https://example/mcp' } })
    expect(mcpRegistryFromEnv(raw)).toEqual({ github: { type: 'http', url: 'https://example/mcp' } })
  })

  it('不正JSONは空表にフォールバックする', () => {
    expect(mcpRegistryFromEnv('{not json')).toEqual({})
  })

  it('配列や非オブジェクトは空表にフォールバックする', () => {
    expect(mcpRegistryFromEnv('[1,2,3]')).toEqual({})
    expect(mcpRegistryFromEnv('"str"')).toEqual({})
  })
})

describe('resolveMcpServers', () => {
  it('登録済みrefのみ実configを返し、未登録は無視', () => {
    const reg = { github: { type: 'http', url: 'https://x/mcp' } } as const
    expect(resolveMcpServers(['github', 'sqlite'], reg)).toEqual({ github: reg.github })
  })
  it('該当ゼロなら undefined', () => {
    expect(resolveMcpServers([], {})).toBeUndefined()
  })
})
