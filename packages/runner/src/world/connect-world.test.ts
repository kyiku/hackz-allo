import { describe, expect, it, vi } from 'vitest'
import { generateWorldState, type ConnectWorldDeps } from './connect-world.js'
import type { FetchedIssue } from './github-issues.js'

const ISSUES: FetchedIssue[] = [
  { number: 1, title: '0除算を防ぐ', body: '...', labels: ['bug'] },
  { number: 2, title: 'リファクタ', body: '...', labels: ['refactor'] },
]

function deps(overrides: Partial<ConnectWorldDeps> = {}): ConnectWorldDeps {
  return {
    fetchIssues: vi.fn(async () => ISSUES),
    generateTests: vi.fn(async () => ['t1', 't2', 't3']),
    now: () => '2026-06-21T00:00:00.000Z',
    ...overrides,
  }
}

describe('generateWorldState', () => {
  it('issueを敵に変換して world.state を組み立てる', async () => {
    const event = await generateWorldState(deps(), 'https://github.com/kyiku/hackz-allo-demo')
    expect(event.type).toBe('world.state')
    expect(event.world).toMatchObject({
      repoOwner: 'kyiku',
      repoName: 'hackz-allo-demo',
      repoUrl: 'https://github.com/kyiku/hackz-allo-demo',
      createdAt: '2026-06-21T00:00:00.000Z',
    })
    expect(event.enemies).toHaveLength(2)
    expect(event.enemies[0]).toMatchObject({
      issueNumber: 1,
      title: '0除算を防ぐ',
      hpTotal: 3, // 必要テスト3件
      hpCurrent: 3,
      difficulty: 'normal',
      weakness: 'null-check', // bug ラベル由来
      status: 'active',
    })
  })

  it('必要テスト生成が失敗してもフォールバックで敵を作る（HP=1）', async () => {
    const event = await generateWorldState(
      deps({
        generateTests: vi.fn(async () => {
          throw new Error('LLM down')
        }),
      }),
      'https://github.com/o/r',
    )
    expect(event.enemies).toHaveLength(2)
    expect(event.enemies[0]).toMatchObject({ hpTotal: 1, difficulty: 'easy' })
  })

  it('issueが0件なら敵も0体', async () => {
    const event = await generateWorldState(
      deps({ fetchIssues: vi.fn(async () => []) }),
      'https://github.com/o/r',
    )
    expect(event.enemies).toEqual([])
  })
})
