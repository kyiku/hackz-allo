import { describe, expect, it, vi } from 'vitest'
import { createGitHubGateway } from './github-gateway'
import type { OctokitLike } from './octokit-like'

const repo = { owner: 'kyiku', name: 'hackz-allo', url: 'https://github.com/kyiku/hackz-allo' }

function gatewayWithPullsCreate(create: OctokitLike['rest']['pulls']['create']) {
  const octokit = {
    rest: {
      repos: { get: vi.fn() },
      issues: { listForRepo: vi.fn() },
      pulls: { create },
    },
  } as unknown as OctokitLike
  return createGitHubGateway({ octokit })
}

describe('GitHubGateway.createPullRequest', () => {
  it('本文に closing keyword (Fixes #n) を付与してPRを作成する', async () => {
    const create = vi.fn(async () => ({
      data: { number: 100, html_url: 'https://github.com/kyiku/hackz-allo/pull/100', node_id: 'PR_x' },
    }))
    const gw = gatewayWithPullsCreate(create)

    const pr = await gw.createPullRequest({
      repo,
      title: 'fix: バグ修正',
      head: 'forge/issue-42-1',
      base: 'main',
      issueNumber: 42,
      body: '対応内容',
    })

    expect(pr).toEqual({ number: 100, url: 'https://github.com/kyiku/hackz-allo/pull/100', nodeId: 'PR_x' })
    const arg = create.mock.calls[0][0]
    expect(arg.body).toContain('対応内容')
    expect(arg.body).toContain('Fixes #42')
    expect(arg).toMatchObject({ owner: 'kyiku', repo: 'hackz-allo', head: 'forge/issue-42-1', base: 'main' })
  })

  it('既に Fixes #n がある場合は重複付与しない', async () => {
    const create = vi.fn(async () => ({
      data: { number: 1, html_url: 'u', node_id: 'n' },
    }))
    const gw = gatewayWithPullsCreate(create)
    await gw.createPullRequest({
      repo,
      title: 't',
      head: 'h',
      base: 'main',
      issueNumber: 42,
      body: 'すでに Fixes #42 を含む',
    })
    const body = create.mock.calls[0][0].body ?? ''
    expect(body.match(/Fixes #42/g)).toHaveLength(1)
  })

  it('bodyが無くても closing keyword を含める', async () => {
    const create = vi.fn(async () => ({ data: { number: 1, html_url: 'u', node_id: 'n' } }))
    const gw = gatewayWithPullsCreate(create)
    await gw.createPullRequest({ repo, title: 't', head: 'h', base: 'main', issueNumber: 7 })
    expect(create.mock.calls[0][0].body).toContain('Fixes #7')
  })
})
