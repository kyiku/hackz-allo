import { describe, expect, it } from 'vitest'
import { parseServerEvent } from '@github-issue-rpg/shared'
import { createTestWatcher } from './test-watcher'
import { createHpTracker } from './hp-tracker'

function setup() {
  const watcher = createTestWatcher(['t1', 't2'])
  const tracker = createHpTracker({ watcher, battleId: 'b1', hpTotal: 2 })
  return { tracker }
}

describe('createHpTracker', () => {
  it('failed ではイベントを出さずHPは総量のまま', () => {
    const { tracker } = setup()
    const r = tracker.recordTest('t1', 'failed')
    expect(r.event).toBeNull()
    expect(r.hpCurrent).toBe(2)
  })

  it('初回passでHP-1とbattle.hp_changedイベントを出す', () => {
    const { tracker } = setup()
    tracker.recordTest('t1', 'failed')
    const r = tracker.recordTest('t1', 'passed')
    expect(r.hpCurrent).toBe(1)
    expect(r.event).not.toBeNull()
    // shared スキーマで検証可能なイベントであること
    const parsed = parseServerEvent(r.event)
    expect(parsed).toMatchObject({ type: 'battle.hp_changed', battleId: 'b1', hpCurrent: 1 })
  })

  it('対象外/二重passではイベントを出さない', () => {
    const { tracker } = setup()
    tracker.recordTest('t1', 'failed')
    tracker.recordTest('t1', 'passed')
    expect(tracker.recordTest('t1', 'passed').event).toBeNull()
    expect(tracker.recordTest('other', 'passed').event).toBeNull()
  })

  it('全対象passでHP0', () => {
    const { tracker } = setup()
    for (const id of ['t1', 't2']) {
      tracker.recordTest(id, 'failed')
      tracker.recordTest(id, 'passed')
    }
    expect(tracker.recordTest('t2', 'passed').hpCurrent).toBe(0)
  })
})
