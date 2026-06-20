import { describe, expect, it, vi } from 'vitest'
import { generateIssueProposal } from './issue-proposal'

describe('generateIssueProposal', () => {
  it('会話とコード文脈から issue案(title/body/labels)を生成する', async () => {
    const generate = vi.fn(async () => ({
      title: 'バリデーションを追加する',
      body: '空入力で落ちるので検証を入れる',
      labels: ['bug'],
    }))
    const proposal = await generateIssueProposal({ generate } as never, {
      conversation: '入力が空のとき落ちる',
      codeContext: 'function submit(x){...}',
    })
    expect(proposal.title).toBe('バリデーションを追加する')
    expect(proposal.labels).toEqual(['bug'])
    expect(generate).toHaveBeenCalledOnce()
  })

  it('codeContext 省略でも生成できる', async () => {
    const generate = vi.fn(async () => ({ title: 't', body: 'b', labels: [] }))
    const proposal = await generateIssueProposal({ generate } as never, { conversation: '何か直したい' })
    expect(proposal.title).toBe('t')
  })
})
