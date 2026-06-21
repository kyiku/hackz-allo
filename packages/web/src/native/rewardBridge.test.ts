import { describe, expect, it } from 'vitest'
import { rewardEffectCards } from './rewardBridge'

describe('rewardEffectCards', () => {
  it('seedで決定的に効果カードを返す（+1多め）', () => {
    const a = rewardEffectCards(7, 6)
    const b = rewardEffectCards(7, 6)
    expect(a).toEqual(b)
    expect(a.length).toBe(6)
    expect(a.every((c) => typeof c.effectId === 'string' && typeof c.label === 'string')).toBe(true)
  })
})
