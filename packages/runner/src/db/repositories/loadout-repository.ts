import type { Loadout } from '@github-issue-rpg/shared'
import type { Db } from '../database.js'

/**
 * loadouts テーブルのデータアクセス層（要件5.10）。
 * 1 プレイヤー = 1 編成。equipped_ids は JSON 文字列で格納する。
 */

interface LoadoutRow {
  player_id: number
  equipped_ids: string
  party_size: number
}

function toLoadout(row: LoadoutRow): Loadout {
  return {
    equippedIds: JSON.parse(row.equipped_ids) as number[],
    partySize: row.party_size,
  }
}

export interface LoadoutUpdate {
  equippedIds: number[]
  partySize: number
}

export interface LoadoutRepository {
  createForPlayer(playerId: number): Loadout
  getByPlayer(playerId: number): Loadout | null
  update(playerId: number, patch: LoadoutUpdate): Loadout
}

export function createLoadoutRepository(db: Db): LoadoutRepository {
  const insert = db.prepare(
    'INSERT INTO loadouts (player_id, equipped_ids, party_size) VALUES (?, ?, ?)',
  )
  const selectByPlayer = db.prepare('SELECT * FROM loadouts WHERE player_id = ?')
  const updateStmt = db.prepare(
    'UPDATE loadouts SET equipped_ids = ?, party_size = ? WHERE player_id = ?',
  )

  return {
    createForPlayer(playerId) {
      insert.run(playerId, '[]', 1)
      return toLoadout(selectByPlayer.get(playerId) as LoadoutRow)
    },
    getByPlayer(playerId) {
      const row = selectByPlayer.get(playerId) as LoadoutRow | undefined
      return row ? toLoadout(row) : null
    },
    update(playerId, patch) {
      const result = updateStmt.run(JSON.stringify(patch.equippedIds), patch.partySize, playerId)
      if (result.changes === 0) {
        throw new Error(`Loadout not found for player: ${playerId}`)
      }
      return toLoadout(selectByPlayer.get(playerId) as LoadoutRow)
    },
  }
}
