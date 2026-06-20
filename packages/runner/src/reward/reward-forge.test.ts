import { describe, expect, it, vi } from 'vitest'
import { rewardSchema } from '@github-issue-rpg/shared'
import { generateReward } from './reward-forge'

describe('generateReward', () => {
  it('diffからLLMで表示名/性能を生成し、abilityIdを付与する', async () => {
    const generate = vi.fn(async () => ({ kind: 'weapon', name: '炎の剣', description: '攻撃力+10' }))
    const reward = await generateReward({ generate } as never, {
      diff: 'diff --git a/x b/x',
      abilityId: 'ability.github-mcp',
    })
    expect(() => rewardSchema.parse(reward)).not.toThrow()
    expect(reward.name).toBe('炎の剣')
    expect(reward.abilityId).toBe('ability.github-mcp')
  })

  it('abilityId 無し（見た目だけの報酬）も許容する', async () => {
    const generate = vi.fn(async () => ({ kind: 'armor', name: '布の服', description: '気休め' }))
    const reward = await generateReward({ generate } as never, { diff: 'd' })
    expect(reward.abilityId).toBeNull()
  })

  it('カタログに無い abilityId はエラー', async () => {
    const generate = vi.fn(async () => ({ kind: 'skill', name: 'x', description: 'y' }))
    await expect(
      generateReward({ generate } as never, { diff: 'd', abilityId: 'ability.bogus' }),
    ).rejects.toThrow()
  })
})
