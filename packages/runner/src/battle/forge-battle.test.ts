import { describe, expect, it, vi } from 'vitest'
import { buildForgePrompt, startForgeBattle } from './forge-battle'

const issue = { number: 42, title: 'バリデーション追加', body: '空入力を弾く', labels: ['bug'] }

describe('buildForgePrompt', () => {
  it('issueとテスト一覧を含むTDD指示を生成する', () => {
    const prompt = buildForgePrompt(issue, ['空入力を拒否する', '正常系で成功する'])
    expect(prompt).toContain('バリデーション追加')
    expect(prompt).toContain('空入力を拒否する')
    expect(prompt).toContain('正常系で成功する')
  })
})

async function* fakeStream() {
  yield { type: 'result', subtype: 'success' }
}

describe('startForgeBattle', () => {
  it('テスト生成→ブランチ作成→ForgeAgent起動の順で結線する', async () => {
    const order: string[] = []
    const generateTests = vi.fn(async () => {
      order.push('generate')
      return ['空入力を拒否する']
    })
    const createWorkBranch = vi.fn(async () => {
      order.push('branch')
      return 'forge/issue-42-1700000000'
    })
    const runForge = vi.fn(() => {
      order.push('forge')
      return fakeStream()
    })

    const result = await startForgeBattle(
      { generateTests, createWorkBranch, runForge },
      { issue, worktreePath: '/tmp/wt', timestamp: 1700000000 },
    )

    expect(order).toEqual(['generate', 'branch', 'forge'])
    expect(createWorkBranch).toHaveBeenCalledWith(42, 1700000000)
    expect(result.branch).toBe('forge/issue-42-1700000000')
    expect(result.tests).toEqual(['空入力を拒否する'])
    const forgeArg = runForge.mock.calls[0][0]
    expect(forgeArg.worktreePath).toBe('/tmp/wt')
    expect(forgeArg.prompt).toContain('空入力を拒否する')
  })
})
