import { describe, expect, it } from 'vitest'
import { enemySchema } from './enemy'

const validEnemy = {
  id: 1,
  worldId: 1,
  issueNumber: 42,
  title: 'バグの巣窟',
  hpTotal: 5,
  hpCurrent: 5,
  difficulty: 'normal',
  weakness: 'null-check',
  status: 'active',
}

describe('enemySchema', () => {
  it('有効な敵オブジェクトをパースする', () => {
    expect(enemySchema.parse(validEnemy)).toEqual(validEnemy)
  })

  it('weaknessはnullを許容する', () => {
    expect(enemySchema.parse({ ...validEnemy, weakness: null }).weakness).toBeNull()
  })

  it('未知のdifficultyを拒否する', () => {
    expect(() => enemySchema.parse({ ...validEnemy, difficulty: 'impossible' })).toThrow()
  })

  it('負のHPを拒否する', () => {
    expect(() => enemySchema.parse({ ...validEnemy, hpCurrent: -1 })).toThrow()
  })
})
