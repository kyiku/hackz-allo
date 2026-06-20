import { describe, expect, it, vi } from 'vitest'
import { fetchOpenIssues, GithubFetchError, parseRepoUrl } from './github-issues.js'

describe('parseRepoUrl', () => {
  it('https URL を owner/name に分解する', () => {
    expect(parseRepoUrl('https://github.com/kyiku/hackz-allo-demo')).toEqual({
      owner: 'kyiku',
      name: 'hackz-allo-demo',
    })
  })

  it('.git 接尾辞・末尾スラッシュを許容する', () => {
    expect(parseRepoUrl('https://github.com/kyiku/hackz-allo-demo.git')).toEqual({
      owner: 'kyiku',
      name: 'hackz-allo-demo',
    })
    expect(parseRepoUrl('https://github.com/o/r/')).toEqual({ owner: 'o', name: 'r' })
  })

  it('SSH 形式も解釈する', () => {
    expect(parseRepoUrl('git@github.com:o/r.git')).toEqual({ owner: 'o', name: 'r' })
  })

  it('解釈不能なURLは例外', () => {
    expect(() => parseRepoUrl('https://example.com/foo')).toThrow()
  })
})

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response
}

describe('fetchOpenIssues', () => {
  it('open issue を整形して返し、PRは除外する', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse([
        { number: 1, title: 'bug fix', body: '本文', labels: [{ name: 'bug' }] },
        { number: 2, title: 'PR', body: '', labels: [], pull_request: { url: 'x' } },
        { number: 3, title: 'sec', body: null, labels: ['security'] },
      ]),
    )
    const issues = await fetchOpenIssues('pat', { owner: 'o', name: 'r' }, fetchImpl)
    expect(issues).toEqual([
      { number: 1, title: 'bug fix', body: '本文', labels: ['bug'] },
      { number: 3, title: 'sec', body: '', labels: ['security'] },
    ])
    // 認証ヘッダと state=open を付けて呼ぶ
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toContain('/repos/o/r/issues')
    expect(url).toContain('state=open')
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer pat')
  })

  it('HTTPエラーは GithubFetchError（status付き）を投げる', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, false, 404))
    await expect(fetchOpenIssues('pat', { owner: 'o', name: 'r' }, fetchImpl)).rejects.toBeInstanceOf(
      GithubFetchError,
    )
    await expect(
      fetchOpenIssues('pat', { owner: 'o', name: 'r' }, fetchImpl),
    ).rejects.toMatchObject({ status: 404 })
  })
})
