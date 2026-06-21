import Database from 'better-sqlite3'
import { LOADOUT_MIGRATION_COLUMNS, SCHEMA_SQL } from './schema.js'

/** better-sqlite3 の Database 型エイリアス。 */
export type Db = Database.Database

/**
 * SQLite データベースを開き、スキーマを適用して返す。
 *
 * - 外部キー制約を有効化する
 * - スキーマは `CREATE TABLE IF NOT EXISTS` のため冪等に適用される
 *
 * @param path ファイルパス、またはインメモリDBの `:memory:`
 */
export function createDatabase(path: string): Db {
  const db = new Database(path)
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA_SQL)
  const cols = new Set(
    (db.prepare('PRAGMA table_info(loadouts)').all() as { name: string }[]).map((c) => c.name),
  )
  for (const m of LOADOUT_MIGRATION_COLUMNS) {
    if (!cols.has(m.name)) db.exec(m.ddl)
  }
  return db
}
