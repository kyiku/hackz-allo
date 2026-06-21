import { describe, expect, it } from 'vitest'
import { MODEL_LADDER, MODEL_TIER_MAX, modelForTier } from './model-ladder'

describe('model-ladder', () => {
  it('4段で sonnet→opus4.6→4.7→4.8', () => {
    expect(MODEL_LADDER).toEqual([
      'claude-sonnet-4-6', 'claude-opus-4-6', 'claude-opus-4-7', 'claude-opus-4-8',
    ])
    expect(MODEL_TIER_MAX).toBe(3)
  })
  it('modelForTierは範囲外を端へクランプ', () => {
    expect(modelForTier(0)).toBe('claude-sonnet-4-6')
    expect(modelForTier(3)).toBe('claude-opus-4-8')
    expect(modelForTier(-5)).toBe('claude-sonnet-4-6')
    expect(modelForTier(99)).toBe('claude-opus-4-8')
  })
})
