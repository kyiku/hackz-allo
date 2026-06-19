import type { Player } from '@github-issue-rpg/shared'
import type { Db } from '../database.js'

interface PlayerRow {
  id: number
  level: number
  exp: number
}

function toPlayer(row: PlayerRow): Player {
  return { id: row.id, level: row.level, exp: row.exp }
}

export interface PlayerRepository {
  create(): Player
  findById(id: number): Player | null
  addExp(id: number, amount: number): Player
  setLevel(id: number, level: number): Player
}

/** players テーブルのデータアクセス層。 */
export function createPlayerRepository(db: Db): PlayerRepository {
  const insert = db.prepare('INSERT INTO players DEFAULT VALUES')
  const selectById = db.prepare('SELECT * FROM players WHERE id = ?')
  const addExpStmt = db.prepare('UPDATE players SET exp = exp + ? WHERE id = ?')
  const setLevelStmt = db.prepare('UPDATE players SET level = ? WHERE id = ?')

  function getOrThrow(id: number): Player {
    const row = selectById.get(id) as PlayerRow | undefined
    if (!row) {
      throw new Error(`Player not found: id=${id}`)
    }
    return toPlayer(row)
  }

  return {
    create() {
      const { lastInsertRowid } = insert.run()
      return getOrThrow(Number(lastInsertRowid))
    },
    findById(id) {
      const row = selectById.get(id) as PlayerRow | undefined
      return row ? toPlayer(row) : null
    },
    addExp(id, amount) {
      const result = addExpStmt.run(amount, id)
      if (result.changes === 0) {
        throw new Error(`Player not found: id=${id}`)
      }
      return getOrThrow(id)
    },
    setLevel(id, level) {
      const result = setLevelStmt.run(level, id)
      if (result.changes === 0) {
        throw new Error(`Player not found: id=${id}`)
      }
      return getOrThrow(id)
    },
  }
}
