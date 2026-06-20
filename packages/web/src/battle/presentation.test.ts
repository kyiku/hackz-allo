import { describe, expect, it } from 'vitest'
import { battleStatusLabel, hpRatio, isBattleActive, logKindClass } from './presentation'

describe('hpRatio', () => {
  it('割合を 0..1 で返す', () => {
    expect(hpRatio(3, 6)).toBe(0.5)
    expect(hpRatio(6, 6)).toBe(1)
    expect(hpRatio(0, 6)).toBe(0)
  })

  it('total<=0 は 0 を返す', () => {
    expect(hpRatio(0, 0)).toBe(0)
    expect(hpRatio(5, 0)).toBe(0)
  })

  it('範囲外はクランプする', () => {
    expect(hpRatio(-1, 6)).toBe(0)
    expect(hpRatio(9, 6)).toBe(1)
  })
})

describe('logKindClass', () => {
  it('種別ごとに異なる色クラスを返す', () => {
    expect(logKindClass('attack')).not.toBe(logKindClass('heal'))
    expect(logKindClass('spell')).toContain('text-')
  })
})

describe('battleStatusLabel', () => {
  it('各状態に日本語ラベルを返す', () => {
    expect(battleStatusLabel('fighting')).toBe('戦闘中')
    expect(battleStatusLabel('defeated')).toBe('撃破')
  })
})

describe('isBattleActive', () => {
  it('撃破・失敗は非アクティブ、それ以外はアクティブ', () => {
    expect(isBattleActive('fighting')).toBe(true)
    expect(isBattleActive('red')).toBe(true)
    expect(isBattleActive('defeated')).toBe(false)
    expect(isBattleActive('failed')).toBe(false)
  })
})
