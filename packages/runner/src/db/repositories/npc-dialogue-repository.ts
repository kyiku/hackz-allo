import type { Db } from '../database.js'

/** NPC会話（敵=Issueの解説）。 */
export interface NpcDialogue {
  id: number
  enemyId: number
  summary: string
  difficultyNote: string
  files: string[]
  winCondition: string
}

export interface CreateNpcDialogueInput {
  enemyId: number
  summary: string
  difficultyNote: string
  files: string[]
  winCondition: string
  createdAt: string
}

interface NpcDialogueRow {
  id: number
  enemy_id: number
  summary: string | null
  difficulty_note: string | null
  files: string | null
  win_condition: string | null
}

function toDialogue(row: NpcDialogueRow): NpcDialogue {
  return {
    id: row.id,
    enemyId: row.enemy_id,
    summary: row.summary ?? '',
    difficultyNote: row.difficulty_note ?? '',
    files: row.files ? (JSON.parse(row.files) as string[]) : [],
    winCondition: row.win_condition ?? '',
  }
}

export interface NpcDialogueRepository {
  create(input: CreateNpcDialogueInput): NpcDialogue
  findByEnemyId(enemyId: number): NpcDialogue | null
}

/** npc_dialogues テーブルのデータアクセス層。files は JSON 文字列で格納する。 */
export function createNpcDialogueRepository(db: Db): NpcDialogueRepository {
  const insert = db.prepare(
    `INSERT INTO npc_dialogues (enemy_id, summary, difficulty_note, files, win_condition, created_at)
     VALUES (@enemyId, @summary, @difficultyNote, @files, @winCondition, @createdAt)`,
  )
  const selectById = db.prepare('SELECT * FROM npc_dialogues WHERE id = ?')
  const selectByEnemy = db.prepare(
    'SELECT * FROM npc_dialogues WHERE enemy_id = ? ORDER BY id DESC LIMIT 1',
  )

  return {
    create(input) {
      const { lastInsertRowid } = insert.run({
        enemyId: input.enemyId,
        summary: input.summary,
        difficultyNote: input.difficultyNote,
        files: JSON.stringify(input.files),
        winCondition: input.winCondition,
        createdAt: input.createdAt,
      })
      return toDialogue(selectById.get(Number(lastInsertRowid)) as NpcDialogueRow)
    },
    findByEnemyId(enemyId) {
      const row = selectByEnemy.get(enemyId) as NpcDialogueRow | undefined
      return row ? toDialogue(row) : null
    },
  }
}
