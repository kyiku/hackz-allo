import { describe, expect, it } from 'vitest'
import { createGitHubGateway } from './github-gateway'
import type { OctokitLike } from './octokit-like'

const repo = { owner: 'kyiku', name: 'hackz-allo', url: 'https://github.com/kyiku/hackz-allo' }

function fakeOctokit(overrides: Partial<OctokitLike['rest']> = {}): OctokitLike {
  return {
    rest: {
      repos: {
        get: async () => ({
          data: { default_branch: 'main', permissions: { admin: false, push: true, pull: true } },
        }),
      },
      issues: {
        listForRepo: async () => ({
          data: [
            {
              number: 42,
              title: 'バグ',
              body: '本文',
              state: 'open',
              labels: [{ name: 'bug' }, { name: 'core' }],
            },
            // PR は issues API に混ざるので除外されること
            { number: 7, title: 'PR', body: '', state: 'open', labels: [], pull_request: {} },
          ],
        }),
      },
      ...overrides,
    },
  } as OctokitLike
}

describe('GitHubGateway.listIssues', () => {
  it('open issueを取得しPRを除外する', async () => {
    const gw = createGitHubGateway({ octokit: fakeOctokit() })
    const issues = await gw.listIssues(repo)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toEqual({
      number: 42,
      title: 'バグ',
      body: '本文',
      state: 'open',
      labels: ['bug', 'core'],
    })
  })
})

describe('GitHubGateway.connectRepository', () => {
  it('push権限があれば接続情報を返す', async () => {
    const gw = createGitHubGateway({ octokit: fakeOctokit() })
    const conn = await gw.connectRepository(repo)
    expect(conn).toEqual({ owner: 'kyiku', name: 'hackz-allo', defaultBranch: 'main', canPush: true })
  })

  it('push権限が無ければ必要権限を案内するエラーを投げる', async () => {
    const octokit = fakeOctokit({
      repos: {
        get: async () => ({
          data: { default_branch: 'main', permissions: { admin: false, push: false, pull: true } },
        }),
      },
    })
    const gw = createGitHubGateway({ octokit })
    await expect(gw.connectRepository(repo)).rejects.toThrow(/権限|Contents: write/)
  })

  it('認証エラー(401)は分かりやすいメッセージにする', async () => {
    const octokit = fakeOctokit({
      repos: {
        get: async () => {
          throw Object.assign(new Error('Bad credentials'), { status: 401 })
        },
      },
    })
    const gw = createGitHubGateway({ octokit })
    await expect(gw.connectRepository(repo)).rejects.toThrow(/認証|PAT/)
  })
})
