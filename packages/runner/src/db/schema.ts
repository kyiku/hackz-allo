/**
 * SQLite スキーマ（デモ用永続化）。
 *
 * design.md の確定スキーマ（worlds / enemies）を含む全15テーブル。
 * battleId はWSイベントで文字列のため battles.id は TEXT。
 * JSON配列カラム（files / equipped_ids）は TEXT に格納する。
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS worlds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_url TEXT NOT NULL,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS repo_workspaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  world_id INTEGER NOT NULL REFERENCES worlds(id),
  branch TEXT,
  worktree_path TEXT,
  base_sha TEXT,
  status TEXT NOT NULL DEFAULT 'idle',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enemies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  world_id INTEGER NOT NULL REFERENCES worlds(id),
  issue_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  hp_total INTEGER NOT NULL,
  hp_current INTEGER NOT NULL,
  difficulty TEXT NOT NULL,
  weakness TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS npc_dialogues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enemy_id INTEGER NOT NULL REFERENCES enemies(id),
  summary TEXT,
  difficulty_note TEXT,
  files TEXT,
  win_condition TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS battles (
  id TEXT PRIMARY KEY,
  enemy_id INTEGER NOT NULL REFERENCES enemies(id),
  status TEXT NOT NULL,
  hp_total INTEGER,
  hp_current INTEGER,
  branch TEXT,
  session_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS battle_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  battle_id TEXT NOT NULL REFERENCES battles(id),
  attempt_no INTEGER NOT NULL,
  session_id TEXT,
  result TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT
);

CREATE TABLE IF NOT EXISTS target_test_cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  battle_id TEXT NOT NULL REFERENCES battles(id),
  name TEXT NOT NULL,
  file TEXT NOT NULL,
  passed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS test_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  battle_id TEXT NOT NULL REFERENCES battles(id),
  test_case_id INTEGER REFERENCES target_test_cases(id),
  state TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS spells (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  battle_id TEXT NOT NULL REFERENCES battles(id),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ci_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  battle_id TEXT NOT NULL REFERENCES battles(id),
  pr_number INTEGER,
  conclusion TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  battle_id TEXT NOT NULL REFERENCES battles(id),
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  ability_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level INTEGER NOT NULL DEFAULT 1,
  exp INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS equipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL REFERENCES players(id),
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  ability_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS loadouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL REFERENCES players(id),
  equipped_ids TEXT NOT NULL DEFAULT '[]',
  party_size INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS work_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  battle_id TEXT REFERENCES battles(id),
  line TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`
