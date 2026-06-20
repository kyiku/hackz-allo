/**
 * TestWatcher（死守コア、要件5.4/6.2）。
 *
 * Vitest 専用 Reporter の `onTestCaseResult` から呼び出す想定の計測ロジック。
 * 対象テストの初回 failed→passed のみカウントし、二重カウントを防ぐ。
 * （Reporter 配線は実行時、ここでは純粋な状態機械として検証可能にする）
 */

type TargetState = 'pending' | 'failed' | 'counted'

export interface RecordResult {
  /** この記録で新たに1件 pass が確定したか（HP-1 のトリガ）。 */
  counted: boolean
}

export interface TestWatcher {
  recordResult(testId: string, state: 'failed' | 'passed'): RecordResult
  getPassedCount(): number
  isComplete(): boolean
}

/**
 * 対象テストIDを固定して TestWatcher を生成する。
 * - failed: 対象かつ未カウントなら failed 状態に遷移
 * - passed: 対象かつ failed 状態からの初回のみカウント（counted）
 */
export function createTestWatcher(targetTestIds: readonly string[]): TestWatcher {
  const states = new Map<string, TargetState>()
  for (const id of targetTestIds) {
    states.set(id, 'pending')
  }
  let passedCount = 0

  return {
    recordResult(testId, state) {
      const current = states.get(testId)
      if (current === undefined || current === 'counted') {
        return { counted: false }
      }
      if (state === 'failed') {
        states.set(testId, 'failed')
        return { counted: false }
      }
      // state === 'passed'
      if (current === 'failed') {
        states.set(testId, 'counted')
        passedCount += 1
        return { counted: true }
      }
      return { counted: false }
    },
    getPassedCount() {
      return passedCount
    },
    isComplete() {
      return passedCount === targetTestIds.length
    },
  }
}
