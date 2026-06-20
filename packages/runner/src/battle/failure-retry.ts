import type { BattleStatus, ServerEvent } from '@github-issue-rpg/shared'
import { battleTransition } from './battle-state-machine.js'
import { createTestWatcher, type TestWatcher } from './test-watcher.js'
import type { TestRunResult } from './target-tests.js'

/**
 * 失敗時の挙動（要件5.6）。
 * テスト未通過/CI失敗時は残HPを維持し、呪文で再戦可能。
 * 進捗・ブランチ・session_id を保持し、再戦時にテスト状態を再計算する。
 */

export interface PreservedBattleState {
  hpCurrent: number
  branch: string
  sessionId: string | null
}

export interface BuildBattleFailureParams extends PreservedBattleState {
  battleId: string
  reason: string
}

export interface BattleFailureResult {
  event: ServerEvent
  preserved: PreservedBattleState
}

/** 戦闘失敗を組み立てる。残HP・ブランチ・session_id を保持し battle.failed を返す。 */
export function buildBattleFailure({
  battleId,
  hpCurrent,
  branch,
  sessionId,
  reason,
}: BuildBattleFailureParams): BattleFailureResult {
  const event: ServerEvent = { type: 'battle.failed', battleId, reason }
  return { event, preserved: { hpCurrent, branch, sessionId } }
}

export interface RetryContext {
  status: BattleStatus
  hpCurrent: number
  branch: string
  resumeSessionId: string | null
}

/** 再戦コンテキストを準備する。HPを維持し fighting へ遷移、ブランチ/session_id を引き継ぐ。 */
export function prepareRetry(preserved: PreservedBattleState): RetryContext {
  return {
    status: battleTransition('failed', 'retry'),
    hpCurrent: preserved.hpCurrent,
    branch: preserved.branch,
    resumeSessionId: preserved.sessionId,
  }
}

/**
 * 再戦時にテスト状態を再計算した TestWatcher を返す。
 * 既に pass 済みのテストは counted 済みとして反映し、HPを継続させる。
 */
export function recomputeTargetsForRetry(
  targetTestIds: readonly string[],
  currentStates: readonly TestRunResult[],
): TestWatcher {
  const watcher = createTestWatcher(targetTestIds)
  for (const { testId, state } of currentStates) {
    if (state === 'passed') {
      watcher.recordResult(testId, 'failed')
      watcher.recordResult(testId, 'passed')
    } else {
      watcher.recordResult(testId, 'failed')
    }
  }
  return watcher
}
