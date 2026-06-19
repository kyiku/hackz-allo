import { describe, expect, it } from 'vitest'
import { createDatabase } from '../database'
import { createWorldRepository } from './world-repository'

function setup() {
  const db = createDatabase(':memory:')
  return createWorldRepository(db)
}

const input = {
  repoOwner: 'kyiku',
  repoName: 'hackz-allo',
  repoUrl: 'https://github.com/kyiku/hackz-allo',
  createdAt: '2026-06-20T00:00:00.000Z',
}

describe('WorldRepository', () => {
  it('ワールドを作成しidを採番する', () => {
    const repo = setup()
    const world = repo.create(input)
    expect(world.id).toBeGreaterThan(0)
    expect(world.repoOwner).toBe('kyiku')
  })

  it('idで取得できる', () => {
    const repo = setup()
    const created = repo.create(input)
    expect(repo.findById(created.id)).toEqual(created)
  })

  it('存在しないidはnullを返す', () => {
    const repo = setup()
    expect(repo.findById(999)).toBeNull()
  })

  it('owner/nameで取得できる', () => {
    const repo = setup()
    repo.create(input)
    expect(repo.findByRepo('kyiku', 'hackz-allo')?.repoName).toBe('hackz-allo')
  })
})
