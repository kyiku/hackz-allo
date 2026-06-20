import { redactSecrets } from '../../log/redaction.js'
import type { Db } from '../database.js'

/** 作業ログ（redaction済み）。 */
export interface WorkLog {
  id: number
  battleId: string | null
  line: string
}

export interface CreateWorkLogInput {
  battleId: string | null
  line: string
  createdAt: string
}

interface WorkLogRow {
  id: number
  battle_id: string | null
  line: string
}

export interface WorkLogRepository {
  create(input: CreateWorkLogInput): WorkLog
  listByBattle(battleId: string): WorkLog[]
}

/** work_logs テーブルのデータアクセス層。保存内容は redaction 済みであること。 */
export function createWorkLogRepository(db: Db): WorkLogRepository {
  const insert = db.prepare(
    'INSERT INTO work_logs (battle_id, line, created_at) VALUES (@battleId, @line, @createdAt)',
  )
  const selectById = db.prepare('SELECT id, battle_id, line FROM work_logs WHERE id = ?')
  const selectByBattle = db.prepare(
    'SELECT id, battle_id, line FROM work_logs WHERE battle_id = ? ORDER BY id',
  )

  return {
    create(input) {
      const { lastInsertRowid } = insert.run(input)
      const row = selectById.get(Number(lastInsertRowid)) as WorkLogRow
      return { id: row.id, battleId: row.battle_id, line: row.line }
    },
    listByBattle(battleId) {
      return (selectByBattle.all(battleId) as WorkLogRow[]).map((row) => ({
        id: row.id,
        battleId: row.battle_id,
        line: row.line,
      }))
    },
  }
}

export interface SaveWorkLogParams {
  battleId: string | null
  line: string
  now: string
}

/** ログを redaction してから保存する（raw は永続化しない）。 */
export function saveWorkLog(repo: WorkLogRepository, { battleId, line, now }: SaveWorkLogParams): WorkLog {
  return repo.create({ battleId, line: redactSecrets(line), createdAt: now })
}
