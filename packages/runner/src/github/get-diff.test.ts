import { describe, expect, it, vi } from 'vitest'
import { createGitHubGateway } from './github-gateway'
import type { OctokitLike } from './octokit-like'

const repo = { owner: 'kyiku', name: 'hackz-allo', url: 'https://github.com/kyiku/hackz-allo' }

describe('GitHubGateway.getDiff', () => {
  it('mediaType=diff でPRのdiff文字列を取得する', async () => {
    const get = vi.fn(async () => ({ data: 'diff --git a/x b/x\n+追加' }))
    const octokit = {
      graphql: vi.fn(),
      rest: { repos: { get: vi.fn() }, issues: { listForRepo: vi.fn() }, checks: { listForRef: vi.fn() }, pulls: { create: vi.fn(), merge: vi.fn(), get } },
    } as unknown as OctokitLike

    const diff = await createGitHubGateway({ octokit }).getDiff(repo, 100)

    expect(diff).toContain('diff --git')
    expect(get.mock.calls[0][0]).toMatchObject({
      owner: 'kyiku',
      repo: 'hackz-allo',
      pull_number: 100,
      mediaType: { format: 'diff' },
    })
  })
})
