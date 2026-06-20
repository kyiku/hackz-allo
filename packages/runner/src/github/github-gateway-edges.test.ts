import { describe, expect, it, vi } from 'vitest'
import { createGitHubGateway } from './github-gateway'
import type { OctokitLike } from './octokit-like'

const repo = { owner: 'k', name: 'r', url: 'https://github.com/k/r' }

function gateway(rest: Partial<OctokitLike['rest']>) {
  const octokit = { graphql: vi.fn(), rest } as unknown as OctokitLike
  return createGitHubGateway({ octokit })
}

describe('connectRepository エラー分岐', () => {
  it('401 は認証エラー案内', async () => {
    const gw = gateway({
      repos: { get: vi.fn(async () => { throw Object.assign(new Error('bad'), { status: 401 }) }) },
    } as never)
    await expect(gw.connectRepository(repo)).rejects.toThrow(/認証|PAT/)
  })

  it('404 はアクセス権案内', async () => {
    const gw = gateway({
      repos: { get: vi.fn(async () => { throw Object.assign(new Error('nf'), { status: 404 }) }) },
    } as never)
    await expect(gw.connectRepository(repo)).rejects.toThrow(/見つからない|アクセス権/)
  })

  it('その他エラーは汎用メッセージ', async () => {
    const gw = gateway({
      repos: { get: vi.fn(async () => { throw new Error('boom') }) },
    } as never)
    await expect(gw.connectRepository(repo)).rejects.toThrow(/エラー/)
  })

  it('push権限なしは必要権限を案内', async () => {
    const gw = gateway({
      repos: { get: vi.fn(async () => ({ data: { default_branch: 'main', permissions: { admin: false, push: false, pull: true } } })) },
    } as never)
    await expect(gw.connectRepository(repo)).rejects.toThrow(/権限/)
  })
})

describe('getCIStatus / getDiff / createIssue', () => {
  it('getCIStatus は check-runs を集約する', async () => {
    const gw = gateway({
      checks: { listForRef: vi.fn(async () => ({ data: { total_count: 1, check_runs: [{ status: 'completed', conclusion: 'success' }] } })) },
    } as never)
    expect((await gw.getCIStatus(repo, 'sha')).state).toBe('success')
  })

  it('getDiff は非文字列data も文字列化する', async () => {
    const gw = gateway({
      pulls: { get: vi.fn(async () => ({ data: 123 })) },
    } as never)
    expect(await gw.getDiff(repo, 1)).toBe('123')
  })

  it('createIssue は number/url を返す', async () => {
    const gw = gateway({
      issues: { create: vi.fn(async () => ({ data: { number: 7, html_url: 'u' } })) },
    } as never)
    expect(await gw.createIssue(repo, { title: 't' })).toEqual({ number: 7, url: 'u' })
  })

  it('enableAutoMerge は GraphQL 成功時 auto を返す', async () => {
    const octokit = {
      graphql: vi.fn(async () => ({})),
      rest: { checks: { listForRef: vi.fn() }, pulls: { merge: vi.fn() } },
    } as unknown as OctokitLike
    const gw = createGitHubGateway({ octokit })
    const result = await gw.enableAutoMerge({ repo, prNumber: 1, nodeId: 'PR_x', headRef: 'sha' })
    expect(result.method).toBe('auto')
  })
})
