import { describe, expect, it } from 'vitest'
import { createDatabase } from '../database'
import { createEnemyRepository } from './enemy-repository'
import { createNpcDialogueRepository } from './npc-dialogue-repository'
import { createWorldRepository } from './world-repository'

function setup() {
  const db = createDatabase(':memory:')
  const world = createWorldRepository(db).create({
    repoOwner: 'k',
    repoName: 'r',
    repoUrl: 'https://github.com/k/r',
    createdAt: '2026-06-20T00:00:00.000Z',
  })
  const enemy = createEnemyRepository(db).create({
    worldId: world.id,
    issueNumber: 1,
    title: 't',
    hpTotal: 3,
    hpCurrent: 3,
    difficulty: 'normal',
    weakness: null,
    status: 'active',
  })
  return { repo: createNpcDialogueRepository(db), enemyId: enemy.id }
}

const dialogue = {
  summary: 'null参照バグの修正',
  difficultyNote: '非同期処理が絡む',
  files: ['src/a.ts', 'src/b.ts'],
  winCondition: '全テストがpassする',
}

describe('NpcDialogueRepository', () => {
  it('作成して enemyId で取得できる（filesはJSON往復）', () => {
    const { repo, enemyId } = setup()
    const created = repo.create({ enemyId, ...dialogue, createdAt: '2026-06-20T00:00:00.000Z' })
    expect(created.id).toBeGreaterThan(0)
    const found = repo.findByEnemyId(enemyId)
    expect(found?.files).toEqual(['src/a.ts', 'src/b.ts'])
    expect(found?.summary).toBe('null参照バグの修正')
  })

  it('未生成なら null', () => {
    const { repo } = setup()
    expect(repo.findByEnemyId(999)).toBeNull()
  })
})
