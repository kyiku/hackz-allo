import { describe, expect, it } from 'vitest'
import { createDatabase } from './database'

const EXPECTED_TABLES = [
  'worlds',
  'repo_workspaces',
  'enemies',
  'npc_dialogues',
  'battles',
  'battle_attempts',
  'target_test_cases',
  'test_events',
  'spells',
  'ci_checks',
  'rewards',
  'players',
  'equipment',
  'loadouts',
  'work_logs',
]

function listTables(db: ReturnType<typeof createDatabase>): string[] {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((row) => (row as { name: string }).name)
}

describe('createDatabase', () => {
  it('スキーマの全テーブルを作成する', () => {
    const db = createDatabase(':memory:')
    const tables = listTables(db)
    for (const table of EXPECTED_TABLES) {
      expect(tables).toContain(table)
    }
  })

  it('複数回適用してもエラーにならない（冪等）', () => {
    const db = createDatabase(':memory:')
    expect(() => createDatabase(':memory:')).not.toThrow()
    expect(listTables(db)).toContain('worlds')
  })

  it('外部キー制約が有効である', () => {
    const db = createDatabase(':memory:')
    const fk = db.pragma('foreign_keys', { simple: true })
    expect(fk).toBe(1)
  })
})
