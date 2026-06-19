import type { Difficulty, Enemy, EnemyStatus } from '@github-issue-rpg/shared'
import type { Db } from '../database'

interface EnemyRow {
  id: number
  world_id: number
  issue_number: number
  title: string
  hp_total: number
  hp_current: number
  difficulty: string
  weakness: string | null
  status: string
}

function toEnemy(row: EnemyRow): Enemy {
  return {
    id: row.id,
    worldId: row.world_id,
    issueNumber: row.issue_number,
    title: row.title,
    hpTotal: row.hp_total,
    hpCurrent: row.hp_current,
    difficulty: row.difficulty as Difficulty,
    weakness: row.weakness,
    status: row.status as EnemyStatus,
  }
}

export interface EnemyRepository {
  create(input: Omit<Enemy, 'id'>): Enemy
  findById(id: number): Enemy | null
  listByWorld(worldId: number): Enemy[]
  updateHp(id: number, hpCurrent: number): Enemy
  updateStatus(id: number, status: EnemyStatus): Enemy
}

/** enemies テーブルのデータアクセス層。 */
export function createEnemyRepository(db: Db): EnemyRepository {
  const insert = db.prepare(
    `INSERT INTO enemies
       (world_id, issue_number, title, hp_total, hp_current, difficulty, weakness, status, created_at)
     VALUES
       (@worldId, @issueNumber, @title, @hpTotal, @hpCurrent, @difficulty, @weakness, @status, @createdAt)`,
  )
  const selectById = db.prepare('SELECT * FROM enemies WHERE id = ?')
  const selectByWorld = db.prepare('SELECT * FROM enemies WHERE world_id = ? ORDER BY issue_number')
  const updateHpStmt = db.prepare('UPDATE enemies SET hp_current = ? WHERE id = ?')
  const updateStatusStmt = db.prepare('UPDATE enemies SET status = ? WHERE id = ?')

  function getOrThrow(id: number): Enemy {
    const row = selectById.get(id) as EnemyRow | undefined
    if (!row) {
      throw new Error(`Enemy not found: id=${id}`)
    }
    return toEnemy(row)
  }

  return {
    create(input) {
      const { lastInsertRowid } = insert.run({
        ...input,
        weakness: input.weakness ?? null,
        createdAt: new Date().toISOString(),
      })
      return getOrThrow(Number(lastInsertRowid))
    },
    findById(id) {
      const row = selectById.get(id) as EnemyRow | undefined
      return row ? toEnemy(row) : null
    },
    listByWorld(worldId) {
      return (selectByWorld.all(worldId) as EnemyRow[]).map(toEnemy)
    },
    updateHp(id, hpCurrent) {
      const result = updateHpStmt.run(hpCurrent, id)
      if (result.changes === 0) {
        throw new Error(`Enemy not found: id=${id}`)
      }
      return getOrThrow(id)
    },
    updateStatus(id, status) {
      const result = updateStatusStmt.run(status, id)
      if (result.changes === 0) {
        throw new Error(`Enemy not found: id=${id}`)
      }
      return getOrThrow(id)
    },
  }
}
