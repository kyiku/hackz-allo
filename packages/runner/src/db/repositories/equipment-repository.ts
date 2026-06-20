import type { Equipment, Reward } from '@github-issue-rpg/shared'
import type { Db } from '../database.js'

/**
 * equipment テーブルのデータアクセス層（要件5.8）。撃破報酬を装備として永続化する。
 */

interface EquipmentRow {
  id: number
  kind: string
  name: string
  ability_id: string | null
}

function toEquipment(row: EquipmentRow): Equipment {
  return {
    id: row.id,
    kind: row.kind as Equipment['kind'],
    name: row.name,
    abilityId: row.ability_id,
  }
}

export interface EquipmentRepository {
  createFromReward(playerId: number, reward: Reward, createdAt: string): Equipment
  listByPlayer(playerId: number): Equipment[]
}

export function createEquipmentRepository(db: Db): EquipmentRepository {
  const insert = db.prepare(
    `INSERT INTO equipment (player_id, kind, name, ability_id, created_at)
     VALUES (@playerId, @kind, @name, @abilityId, @createdAt)`,
  )
  const selectById = db.prepare('SELECT id, kind, name, ability_id FROM equipment WHERE id = ?')
  const selectByPlayer = db.prepare(
    'SELECT id, kind, name, ability_id FROM equipment WHERE player_id = ? ORDER BY id',
  )

  return {
    createFromReward(playerId, reward, createdAt) {
      const { lastInsertRowid } = insert.run({
        playerId,
        kind: reward.kind,
        name: reward.name,
        abilityId: reward.abilityId,
        createdAt,
      })
      return toEquipment(selectById.get(Number(lastInsertRowid)) as EquipmentRow)
    },
    listByPlayer(playerId) {
      return (selectByPlayer.all(playerId) as EquipmentRow[]).map(toEquipment)
    },
  }
}
