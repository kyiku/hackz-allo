import { describe, expect, it } from 'vitest'
import { removedIssueNumbers } from './issue-poll.js'

describe('removedIssueNumbers', () => {
  it('previousにあってcurrentに無い番号（クローズ）を返す', () => {
    expect(removedIssueNumbers(new Set([1, 2, 3]), new Set([1, 3]))).toEqual([2])
  })

  it('増減なしなら空', () => {
    expect(removedIssueNumbers(new Set([1, 2]), new Set([1, 2]))).toEqual([])
  })

  it('新規追加（currentにだけある）は無視する', () => {
    expect(removedIssueNumbers(new Set([1]), new Set([1, 5]))).toEqual([])
  })

  it('全部閉じたら全部返す', () => {
    expect(removedIssueNumbers(new Set([1, 2]), new Set()).sort()).toEqual([1, 2])
  })
})
