import { describe, expect, it } from 'vitest'
import { finalizeRedTargets } from './target-tests'

describe('finalizeRedTargets', () => {
  it('failed のテストを対象に固定し HP=件数 を確定する', () => {
    const result = finalizeRedTargets([
      { testId: 't1', state: 'failed' },
      { testId: 't2', state: 'failed' },
      { testId: 't3', state: 'failed' },
    ])
    expect(result.targetTestIds).toEqual(['t1', 't2', 't3'])
    expect(result.hpTotal).toBe(3)
  })

  it('初期passのテストは対象から除外する（RED未確認）', () => {
    const result = finalizeRedTargets([
      { testId: 't1', state: 'failed' },
      { testId: 't2', state: 'passed' },
    ])
    expect(result.targetTestIds).toEqual(['t1'])
    expect(result.hpTotal).toBe(1)
  })

  it('REDのテストが1件も無ければ例外（戦闘不能）', () => {
    expect(() => finalizeRedTargets([{ testId: 't1', state: 'passed' }])).toThrow()
    expect(() => finalizeRedTargets([])).toThrow()
  })
})
