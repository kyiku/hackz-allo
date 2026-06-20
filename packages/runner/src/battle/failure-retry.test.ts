import { describe, expect, it } from 'vitest'
import { parseServerEvent } from '@github-issue-rpg/shared'
import { buildBattleFailure, prepareRetry, recomputeTargetsForRetry } from './failure-retry'

describe('buildBattleFailure', () => {
  it('残HP・ブランチ・session_idを保持し battle.failed を出す', () => {
    const { event, preserved } = buildBattleFailure({
      battleId: 'b1',
      hpCurrent: 2,
      branch: 'forge/issue-42-1',
      sessionId: 'sess_x',
      reason: 'CI失敗',
    })
    expect(preserved).toEqual({ hpCurrent: 2, branch: 'forge/issue-42-1', sessionId: 'sess_x' })
    const parsed = parseServerEvent(event)
    expect(parsed).toMatchObject({ type: 'battle.failed', battleId: 'b1', reason: 'CI失敗' })
  })
})

describe('prepareRetry', () => {
  it('HPを維持しfighting状態でブランチ/session_idを引き継ぐ', () => {
    const ctx = prepareRetry({ hpCurrent: 2, branch: 'forge/issue-42-1', sessionId: 'sess_x' })
    expect(ctx.status).toBe('fighting')
    expect(ctx.hpCurrent).toBe(2)
    expect(ctx.branch).toBe('forge/issue-42-1')
    expect(ctx.resumeSessionId).toBe('sess_x')
  })
})

describe('recomputeTargetsForRetry', () => {
  it('再戦時、既にpass済みのテストを反映してHPを継続する', () => {
    const watcher = recomputeTargetsForRetry(['t1', 't2', 't3'], [
      { testId: 't1', state: 'passed' },
      { testId: 't2', state: 'failed' },
    ])
    // t1 は既にpass済み扱い → passedCount=1
    expect(watcher.getPassedCount()).toBe(1)
    // 残りの t2 を failed→passed させると 2 件目が確定
    watcher.recordResult('t2', 'failed')
    expect(watcher.recordResult('t2', 'passed').counted).toBe(true)
    expect(watcher.getPassedCount()).toBe(2)
  })
})
