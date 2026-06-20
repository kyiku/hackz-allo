import { describe, expect, it } from 'vitest'
import { createTestWatcher } from './test-watcher'

describe('createTestWatcher', () => {
  it('対象テストの初回 failed→passed をカウントする', () => {
    const w = createTestWatcher(['t1', 't2'])
    expect(w.recordResult('t1', 'failed').counted).toBe(false)
    const r = w.recordResult('t1', 'passed')
    expect(r.counted).toBe(true)
    expect(w.getPassedCount()).toBe(1)
  })

  it('failed を経ずに passed したものはカウントしない', () => {
    const w = createTestWatcher(['t1'])
    expect(w.recordResult('t1', 'passed').counted).toBe(false)
    expect(w.getPassedCount()).toBe(0)
  })

  it('二重カウントしない（counted後のpassedは無視）', () => {
    const w = createTestWatcher(['t1'])
    w.recordResult('t1', 'failed')
    w.recordResult('t1', 'passed')
    expect(w.recordResult('t1', 'passed').counted).toBe(false)
    expect(w.getPassedCount()).toBe(1)
  })

  it('対象外テストは無視する', () => {
    const w = createTestWatcher(['t1'])
    w.recordResult('other', 'failed')
    expect(w.recordResult('other', 'passed').counted).toBe(false)
    expect(w.getPassedCount()).toBe(0)
  })

  it('全対象がpassしたら完了', () => {
    const w = createTestWatcher(['t1', 't2'])
    expect(w.isComplete()).toBe(false)
    w.recordResult('t1', 'failed')
    w.recordResult('t1', 'passed')
    w.recordResult('t2', 'failed')
    w.recordResult('t2', 'passed')
    expect(w.isComplete()).toBe(true)
  })
})
