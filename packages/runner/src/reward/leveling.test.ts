import { describe, expect, it } from 'vitest'
import { applyExpGain, levelForExp } from './leveling'

describe('levelForExp', () => {
  it('100EXPごとにレベルが上がる（Lv1始まり）', () => {
    expect(levelForExp(0)).toBe(1)
    expect(levelForExp(99)).toBe(1)
    expect(levelForExp(100)).toBe(2)
    expect(levelForExp(250)).toBe(3)
  })
})

describe('applyExpGain', () => {
  it('EXPを加算しレベルを再計算する', () => {
    expect(applyExpGain({ level: 1, exp: 0 }, 50)).toEqual({ level: 1, exp: 50, leveledUp: false })
  })

  it('閾値を超えるとレベルアップする', () => {
    expect(applyExpGain({ level: 1, exp: 50 }, 60)).toEqual({ level: 2, exp: 110, leveledUp: true })
  })

  it('一気に複数レベル上がる', () => {
    expect(applyExpGain({ level: 1, exp: 0 }, 350).level).toBe(4)
  })
})
