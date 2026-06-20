import type { ServerEvent } from '@github-issue-rpg/shared'
import type { TestWatcher } from './test-watcher.js'

/**
 * 1 pass = HP-1 のリアルタイム反映（死守コア、要件5.4/6.2）。
 * TestWatcher の counted（対象テストの初回pass）に応じてHPを1減らし、
 * battle.hp_changed イベントを生成する。
 */

export interface HpTrackerDeps {
  watcher: TestWatcher
  battleId: string
  hpTotal: number
}

export interface RecordTestResult {
  hpCurrent: number
  /** HPが減ったときのみ battle.hp_changed を返す。 */
  event: ServerEvent | null
}

export interface HpTracker {
  recordTest(testId: string, state: 'failed' | 'passed'): RecordTestResult
}

/** TestWatcher を包み、pass確定時にHP更新とWSイベント生成を行う。 */
export function createHpTracker({ watcher, battleId, hpTotal }: HpTrackerDeps): HpTracker {
  return {
    recordTest(testId, state) {
      const { counted } = watcher.recordResult(testId, state)
      const hpCurrent = hpTotal - watcher.getPassedCount()
      if (!counted) {
        return { hpCurrent, event: null }
      }
      const event: ServerEvent = { type: 'battle.hp_changed', battleId, hpCurrent }
      return { hpCurrent, event }
    },
  }
}
