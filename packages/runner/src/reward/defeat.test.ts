import { describe, expect, it, vi } from 'vitest'
import { parseServerEvent } from '@github-issue-rpg/shared'
import { buildDefeatedEvent, confirmDefeatAndMerge } from './defeat'

const repo = { owner: 'k', name: 'r', url: 'https://github.com/k/r' }

describe('confirmDefeatAndMerge', () => {
  it('PR作成(closing keyword)→auto-merge連携の順で実行する', async () => {
    const order: string[] = []
    const createPullRequest = vi.fn(async () => {
      order.push('pr')
      return { number: 100, url: 'https://github.com/k/r/pull/100', nodeId: 'PR_x' }
    })
    const enableAutoMerge = vi.fn(async () => {
      order.push('merge')
      return { merged: true, method: 'squash-fallback' as const }
    })

    const result = await confirmDefeatAndMerge(
      { createPullRequest, enableAutoMerge },
      { repo, issueNumber: 42, branch: 'forge/issue-42-1', base: 'main', prTitle: 'fix #42', headRef: 'forge/issue-42-1' },
    )

    expect(order).toEqual(['pr', 'merge'])
    expect(createPullRequest).toHaveBeenCalledWith(
      expect.objectContaining({ repo, issueNumber: 42, head: 'forge/issue-42-1', base: 'main' }),
    )
    expect(enableAutoMerge).toHaveBeenCalledWith(
      expect.objectContaining({ repo, prNumber: 100, nodeId: 'PR_x', headRef: 'forge/issue-42-1' }),
    )
    expect(result.pr.number).toBe(100)
    expect(result.autoMerge.merged).toBe(true)
  })
})

describe('buildDefeatedEvent', () => {
  it('battle.defeated イベントを生成する', () => {
    const reward = { kind: 'weapon' as const, name: '炎の剣', description: '攻撃力UP', abilityId: null }
    const event = buildDefeatedEvent('b1', 7, reward)
    expect(parseServerEvent(event)).toMatchObject({ type: 'battle.defeated', battleId: 'b1', enemyId: 7, reward })
  })
})
