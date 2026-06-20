import { describe, expect, it, vi } from 'vitest'
import { registerProposal } from './register'

const repo = { owner: 'k', name: 'r', url: 'https://github.com/k/r' }
const proposal = { title: 'バグ修正', body: '空入力対応', labels: ['bug'] }

describe('registerProposal', () => {
  it('GitHubGateway.createIssue でissueを登録し番号を返す', async () => {
    const createIssue = vi.fn(async () => ({ number: 123, url: 'https://github.com/k/r/issues/123' }))
    const result = await registerProposal({ createIssue } as never, repo, proposal)
    expect(createIssue).toHaveBeenCalledWith(repo, { title: 'バグ修正', body: '空入力対応', labels: ['bug'] })
    expect(result.number).toBe(123)
  })
})
