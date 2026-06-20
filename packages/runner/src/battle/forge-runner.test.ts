import type { ServerEvent } from '@github-issue-rpg/shared'
import { describe, expect, it, vi } from 'vitest'
import { runForgeBattle, type ForgeRunnerDeps } from './forge-runner.js'

const ISSUE = { number: 1, title: '0除算を防ぐ', body: '...', labels: ['bug'] }

function makeDeps(overrides: Partial<ForgeRunnerDeps> = {}): {
  deps: ForgeRunnerDeps
  events: ServerEvent[]
} {
  const events: ServerEvent[] = []
  const deps: ForgeRunnerDeps = {
    emit: vi.fn(async (e: ServerEvent) => void events.push(e)),
    getIssue: vi.fn(async () => ISSUE),
    generateTests: vi.fn(async () => ['t1', 't2']),
    prepareWorkspace: vi.fn(async () => ({ path: '/tmp/wt', branch: 'forge/issue-1-9' })),
    runAgent: async function* () {
      yield { type: 'assistant', message: { content: [{ type: 'text', text: '実装中' }] } }
    },
    runTests: vi.fn(async () => ({ passed: true, summary: '2 passed' })),
    publish: vi.fn(async () => 'https://github.com/o/r/pull/9'),
    cleanup: vi.fn(async () => {}),
    now: () => 9,
    ...overrides,
  }
  return { deps, events }
}

function types(events: ServerEvent[]): string[] {
  return events.map((e) => e.type)
}

describe('runForgeBattle', () => {
  it('成功時: started→log→hp_changed(0まで)→PR→defeated を配信する', async () => {
    const { deps, events } = makeDeps()
    await runForgeBattle(deps, { issueNumber: 1 })

    expect(types(events)).toEqual([
      'battle.started',
      'battle.log', // 🌿 準備完了
      'battle.log', // エージェントのテキスト
      'battle.hp_changed', // hp 1
      'battle.hp_changed', // hp 0
      'battle.log', // PR
      'battle.defeated',
    ])
    const started = events[0] as Extract<ServerEvent, { type: 'battle.started' }>
    expect(started).toMatchObject({ enemyId: 1, hpTotal: 2 })
    const last = events.at(-1) as Extract<ServerEvent, { type: 'battle.defeated' }>
    expect(last.enemyId).toBe(1)
    expect(deps.publish).toHaveBeenCalledOnce()
    expect(deps.cleanup).toHaveBeenCalledWith('/tmp/wt')
  })

  it('テスト不合格なら PR を作らず battle.failed', async () => {
    const { deps, events } = makeDeps({
      runTests: vi.fn(async () => ({ passed: false, summary: '1 failed' })),
    })
    await runForgeBattle(deps, { issueNumber: 1 })

    expect(types(events)).toContain('battle.failed')
    expect(types(events)).not.toContain('battle.defeated')
    expect(deps.publish).not.toHaveBeenCalled()
    expect(deps.cleanup).toHaveBeenCalled()
  })

  it('issueが無ければ started→failed（準備はしない／UIが固まらない）', async () => {
    const { deps, events } = makeDeps({ getIssue: vi.fn(async () => null) })
    await runForgeBattle(deps, { issueNumber: 99 })

    expect(types(events)).toEqual(['battle.started', 'battle.failed'])
    expect(deps.prepareWorkspace).not.toHaveBeenCalled()
  })

  it('途中で例外でも battle.failed に落とし、後始末する', async () => {
    const { deps, events } = makeDeps({
      runAgent: async function* () {
        throw new Error('SDK boom')
      },
    })
    await runForgeBattle(deps, { issueNumber: 1 })

    expect(types(events)).toContain('battle.failed')
    expect(deps.cleanup).toHaveBeenCalled()
  })
})
