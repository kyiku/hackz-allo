import { describe, expect, it } from 'vitest'
import { battleTransition, deriveStatusFromHp, isTerminal } from './battle-state-machine'

describe('battleTransition', () => {
  it('出現→RED→戦闘中→詰め→撃破の正常系', () => {
    expect(battleTransition('appeared', 'red_confirmed')).toBe('red')
    expect(battleTransition('red', 'engage')).toBe('fighting')
    expect(battleTransition('fighting', 'enter_closing')).toBe('closing')
    expect(battleTransition('closing', 'defeat')).toBe('defeated')
  })

  it('戦闘中/詰めから失敗へ遷移できる', () => {
    expect(battleTransition('fighting', 'fail')).toBe('failed')
    expect(battleTransition('closing', 'fail')).toBe('failed')
  })

  it('失敗から再戦で戦闘中へ戻る', () => {
    expect(battleTransition('failed', 'retry')).toBe('fighting')
  })

  it('不正な遷移は例外', () => {
    expect(() => battleTransition('appeared', 'defeat')).toThrow()
    expect(() => battleTransition('defeated', 'retry')).toThrow()
  })
})

describe('isTerminal', () => {
  it('defeated は終端、それ以外は非終端', () => {
    expect(isTerminal('defeated')).toBe(true)
    expect(isTerminal('failed')).toBe(false)
    expect(isTerminal('fighting')).toBe(false)
  })
})

describe('deriveStatusFromHp', () => {
  it('HP0で defeated', () => {
    expect(deriveStatusFromHp('fighting', 0, 5)).toBe('defeated')
  })

  it('残りHPが総量の25%以下で closing(詰め)', () => {
    expect(deriveStatusFromHp('fighting', 1, 5)).toBe('closing')
  })

  it('まだ余裕があれば fighting のまま', () => {
    expect(deriveStatusFromHp('fighting', 4, 5)).toBe('fighting')
  })
})
