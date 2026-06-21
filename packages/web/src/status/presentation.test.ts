import { describe, expect, it } from 'vitest'
import { toggleMcpRef } from './presentation'

describe('toggleMcpRef', () => {
  it('未選択の ref を枠内なら追加する', () => {
    expect(toggleMcpRef(['github'], 'context7', 2)).toEqual(['github', 'context7'])
  })

  it('選択済みの ref は枠に関係なく外す', () => {
    expect(toggleMcpRef(['github', 'context7'], 'github', 2)).toEqual(['context7'])
  })

  it('枠を超える追加は元の配列を保つ', () => {
    expect(toggleMcpRef(['github', 'context7'], 'sqlite', 2)).toEqual(['github', 'context7'])
  })

  it('mcpSlots=0 では何も追加できない', () => {
    expect(toggleMcpRef([], 'github', 0)).toEqual([])
  })

  it('入力配列を破壊しない（イミュータブル）', () => {
    const refs = ['github']
    toggleMcpRef(refs, 'context7', 2)
    expect(refs).toEqual(['github'])
  })
})
