import type { World } from '@github-issue-rpg/shared'
import type { Db } from '../database'

interface WorldRow {
  id: number
  repo_url: string
  repo_owner: string
  repo_name: string
  created_at: string
}

function toWorld(row: WorldRow): World {
  return {
    id: row.id,
    repoOwner: row.repo_owner,
    repoName: row.repo_name,
    repoUrl: row.repo_url,
    createdAt: row.created_at,
  }
}

export interface WorldRepository {
  create(input: Omit<World, 'id'>): World
  findById(id: number): World | null
  findByRepo(owner: string, name: string): World | null
  listAll(): World[]
}

/** worlds テーブルのデータアクセス層。 */
export function createWorldRepository(db: Db): WorldRepository {
  const insert = db.prepare(
    `INSERT INTO worlds (repo_url, repo_owner, repo_name, created_at)
     VALUES (@repoUrl, @repoOwner, @repoName, @createdAt)`,
  )
  const selectById = db.prepare('SELECT * FROM worlds WHERE id = ?')
  const selectByRepo = db.prepare('SELECT * FROM worlds WHERE repo_owner = ? AND repo_name = ?')
  const selectAll = db.prepare('SELECT * FROM worlds ORDER BY id')

  return {
    create(input) {
      const { lastInsertRowid } = insert.run(input)
      const row = selectById.get(Number(lastInsertRowid)) as WorldRow
      return toWorld(row)
    },
    findById(id) {
      const row = selectById.get(id) as WorldRow | undefined
      return row ? toWorld(row) : null
    },
    findByRepo(owner, name) {
      const row = selectByRepo.get(owner, name) as WorldRow | undefined
      return row ? toWorld(row) : null
    },
    listAll() {
      return (selectAll.all() as WorldRow[]).map(toWorld)
    },
  }
}
