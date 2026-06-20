import { describe, expect, it } from 'vitest'
import { reconcileEnemies } from './issue-reconciler'

describe('reconcileEnemies', () => {
  it('新規 open issue は追加対象', () => {
    const result = reconcileEnemies([{ id: 1, issueNumber: 10, status: 'active' }], [10, 11])
    expect(result.toAdd).toEqual([11])
    expect(result.toRemove).toEqual([])
  })

  it('close された(open一覧に無い)active敵は撤去対象', () => {
    const result = reconcileEnemies(
      [
        { id: 1, issueNumber: 10, status: 'active' },
        { id: 2, issueNumber: 11, status: 'active' },
      ],
      [10],
    )
    expect(result.toRemove).toEqual([2])
    expect(result.toAdd).toEqual([])
  })

  it('変化なしなら追加も撤去も無し', () => {
    const result = reconcileEnemies([{ id: 1, issueNumber: 10, status: 'active' }], [10])
    expect(result).toEqual({ toAdd: [], toRemove: [] })
  })

  it('撃破済み(defeated)の敵は撤去対象にしない', () => {
    const result = reconcileEnemies([{ id: 1, issueNumber: 10, status: 'defeated' }], [])
    expect(result.toRemove).toEqual([])
  })

  it('既存(任意status)があるissueは再追加しない', () => {
    const result = reconcileEnemies([{ id: 1, issueNumber: 10, status: 'defeated' }], [10])
    expect(result.toAdd).toEqual([])
  })
})
