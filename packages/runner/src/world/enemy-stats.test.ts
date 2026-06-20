import { describe, expect, it, vi } from 'vitest'
import { buildEnemyStats, computeDifficulty, deriveWeakness, generateRequiredTests } from './enemy-stats'

describe('computeDifficulty', () => {
  it('テスト件数で難易度を決める', () => {
    expect(computeDifficulty(1)).toBe('easy')
    expect(computeDifficulty(4)).toBe('normal')
    expect(computeDifficulty(8)).toBe('hard')
    expect(computeDifficulty(20)).toBe('boss')
  })
})

describe('deriveWeakness', () => {
  it('ラベルから弱点を導く', () => {
    expect(deriveWeakness(['bug'])).toBe('null-check')
    expect(deriveWeakness(['security'])).toBe('injection')
    expect(deriveWeakness(['refactor'])).toBe('complexity')
  })

  it('該当ラベルが無ければ汎用の弱点', () => {
    expect(deriveWeakness(['enhancement'])).toBe('edge-case')
    expect(deriveWeakness([])).toBe('edge-case')
  })
})

describe('buildEnemyStats', () => {
  it('HP=対象テスト件数、難易度/弱点を算出する', () => {
    const stats = buildEnemyStats({ requiredTests: ['a', 'b', 'c'], labels: ['security'] })
    expect(stats.hpTotal).toBe(3)
    expect(stats.hpCurrent).toBe(3)
    expect(stats.difficulty).toBe('normal')
    expect(stats.weakness).toBe('injection')
  })

  it('テストが空ならHP1で下限を保証する', () => {
    expect(buildEnemyStats({ requiredTests: [], labels: [] }).hpTotal).toBe(1)
  })
})

describe('generateRequiredTests', () => {
  it('構造化生成器から必要テスト一覧を取得する', async () => {
    const generate = vi.fn(async () => ({ tests: ['空入力を拒否する', '正常系で成功する'] }))
    const tests = await generateRequiredTests(
      { generate } as never,
      { title: 'バリデーション追加', body: '...', labels: ['bug'] },
    )
    expect(tests).toEqual(['空入力を拒否する', '正常系で成功する'])
    expect(generate).toHaveBeenCalledOnce()
  })
})
