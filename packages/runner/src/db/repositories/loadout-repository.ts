import type { Loadout } from '@github-issue-rpg/shared'
import { INITIAL_LOADOUT } from '@github-issue-rpg/shared'
import type { Db } from '../database.js'

/**
 * loadouts テーブルのデータアクセス層（要件5.10）。
 * 1 プレイヤー = 1 編成。容量/割り当てモデル（Task4）を永続化する。
 * enabled_mcp_refs は JSON 文字列で格納する。
 */

interface LoadoutRow {
  player_id: number
  party_size: number
  mcp_slots: number
  party_slots: number
  model_tier_max: number
  enabled_mcp_refs: string
  selected_model_tier: number
}

function toLoadout(row: LoadoutRow): Loadout {
  return {
    partySize: row.party_size,
    mcpSlots: row.mcp_slots,
    partySlots: row.party_slots,
    modelTierMax: row.model_tier_max,
    enabledMcpRefs: JSON.parse(row.enabled_mcp_refs) as string[],
    selectedModelTier: row.selected_model_tier,
  }
}

export interface LoadoutRepository {
  createForPlayer(playerId: number): Loadout
  getByPlayer(playerId: number): Loadout | null
  update(playerId: number, loadout: Loadout): Loadout
}

export function createLoadoutRepository(db: Db): LoadoutRepository {
  const insert = db.prepare('INSERT INTO loadouts (player_id, party_size) VALUES (?, ?)')
  const selectByPlayer = db.prepare('SELECT * FROM loadouts WHERE player_id = ?')
  const updateStmt = db.prepare(
    `UPDATE loadouts SET party_size = ?, mcp_slots = ?, party_slots = ?,
       model_tier_max = ?, enabled_mcp_refs = ?, selected_model_tier = ?
     WHERE player_id = ?`,
  )
  return {
    createForPlayer(playerId) {
      insert.run(playerId, INITIAL_LOADOUT.partySize)
      return toLoadout(selectByPlayer.get(playerId) as LoadoutRow)
    },
    getByPlayer(playerId) {
      const row = selectByPlayer.get(playerId) as LoadoutRow | undefined
      return row ? toLoadout(row) : null
    },
    update(playerId, loadout) {
      const result = updateStmt.run(
        loadout.partySize,
        loadout.mcpSlots,
        loadout.partySlots,
        loadout.modelTierMax,
        JSON.stringify(loadout.enabledMcpRefs),
        loadout.selectedModelTier,
        playerId,
      )
      if (result.changes === 0) throw new Error(`Loadout not found for player: ${playerId}`)
      return toLoadout(selectByPlayer.get(playerId) as LoadoutRow)
    },
  }
}
