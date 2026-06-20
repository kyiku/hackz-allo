import type { Difficulty } from '@github-issue-rpg/shared'
import { describe, expect, it } from 'vitest'
import { enemyGivenName, enemyName, enemySpecies } from './enemyName'

describe('enemySpecies', () => {
  it('難易度ごとに種族名を返す', () => {
    const cases: Record<Difficulty, string> = {
      easy: 'スライム',
      normal: 'クラブ',
      hard: 'ゴースト',
      boss: 'スパイダー',
    }
    for (const [difficulty, species] of Object.entries(cases)) {
      expect(enemySpecies(difficulty as Difficulty)).toBe(species)
    }
  })
})

describe('enemyGivenName', () => {
  it('同一issue番号で決定的', () => {
    expect(enemyGivenName(11)).toBe(enemyGivenName(11))
  })

  it('負数や大きな番号でも空にならない', () => {
    for (const n of [-5, 0, 42, 2_147_483_647]) {
      expect(enemyGivenName(n)).toMatch(/.+/)
    }
  })
})

describe('enemyName', () => {
  it('種族名・個体名 の形式', () => {
    expect(enemyName('hard', 11)).toBe(`ゴースト・${enemyGivenName(11)}`)
  })
})
