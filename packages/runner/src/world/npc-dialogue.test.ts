import { describe, expect, it, vi } from 'vitest'
import { generateNpcDialogue, getOrCreateNpcDialogue } from './npc-dialogue'

const issue = { title: 'バグ修正', body: 'null参照', labels: ['bug'] }

describe('generateNpcDialogue', () => {
  it('構造化生成器から会話内容を得る', async () => {
    const generate = vi.fn(async () => ({
      summary: '要点',
      difficultyNote: '難所',
      files: ['a.ts'],
      winCondition: '勝利条件',
    }))
    const result = await generateNpcDialogue({ generate } as never, issue)
    expect(result.summary).toBe('要点')
    expect(result.files).toEqual(['a.ts'])
  })
})

describe('getOrCreateNpcDialogue', () => {
  it('キャッシュがあれば生成せず返す', async () => {
    const cached = { id: 1, enemyId: 5, summary: 'c', difficultyNote: '', files: [], winCondition: '' }
    const repo = { findByEnemyId: vi.fn(() => cached), create: vi.fn() }
    const generate = vi.fn()
    const result = await getOrCreateNpcDialogue({
      repo: repo as never,
      generator: { generate } as never,
      enemyId: 5,
      issue,
      now: '2026-06-20T00:00:00.000Z',
    })
    expect(result).toBe(cached)
    expect(generate).not.toHaveBeenCalled()
    expect(repo.create).not.toHaveBeenCalled()
  })

  it('キャッシュが無ければ生成して保存する', async () => {
    const created = { id: 2, enemyId: 5, summary: 's', difficultyNote: 'd', files: ['a.ts'], winCondition: 'w' }
    const repo = { findByEnemyId: vi.fn(() => null), create: vi.fn(() => created) }
    const generate = vi.fn(async () => ({ summary: 's', difficultyNote: 'd', files: ['a.ts'], winCondition: 'w' }))
    const result = await getOrCreateNpcDialogue({
      repo: repo as never,
      generator: { generate } as never,
      enemyId: 5,
      issue,
      now: '2026-06-20T00:00:00.000Z',
    })
    expect(result).toBe(created)
    expect(repo.create).toHaveBeenCalledOnce()
  })
})
