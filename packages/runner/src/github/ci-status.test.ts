import { describe, expect, it, vi } from 'vitest'
import { aggregateCheckRuns, waitForCI } from './ci-status'

describe('aggregateCheckRuns', () => {
  it('checksが無ければ no_checks（成功扱いにしない）', () => {
    expect(aggregateCheckRuns([])).toEqual({ state: 'no_checks', total: 0 })
  })

  it('未完了があれば pending', () => {
    expect(
      aggregateCheckRuns([
        { status: 'completed', conclusion: 'success' },
        { status: 'in_progress', conclusion: null },
      ]).state,
    ).toBe('pending')
  })

  it('全完了で全成功なら success', () => {
    expect(
      aggregateCheckRuns([
        { status: 'completed', conclusion: 'success' },
        { status: 'completed', conclusion: 'skipped' },
      ]).state,
    ).toBe('success')
  })

  it('失敗系が1つでもあれば failure', () => {
    expect(
      aggregateCheckRuns([
        { status: 'completed', conclusion: 'success' },
        { status: 'completed', conclusion: 'failure' },
      ]).state,
    ).toBe('failure')
  })
})

describe('waitForCI', () => {
  it('pending が解消するまでポーリングして終端状態を返す', async () => {
    const statuses = [
      { state: 'pending' as const, total: 1 },
      { state: 'pending' as const, total: 1 },
      { state: 'success' as const, total: 1 },
    ]
    const fetchStatus = vi.fn(async () => statuses.shift()!)
    const sleep = vi.fn(async () => {})

    const result = await waitForCI(fetchStatus, { sleep, intervalMs: 1 })

    expect(result.state).toBe('success')
    expect(fetchStatus).toHaveBeenCalledTimes(3)
    expect(sleep).toHaveBeenCalledTimes(2)
  })

  it('maxAttempts に達したら pending のまま返す', async () => {
    const fetchStatus = vi.fn(async () => ({ state: 'pending' as const, total: 1 }))
    const result = await waitForCI(fetchStatus, { sleep: async () => {}, maxAttempts: 3 })
    expect(result.state).toBe('pending')
    expect(fetchStatus).toHaveBeenCalledTimes(3)
  })
})
