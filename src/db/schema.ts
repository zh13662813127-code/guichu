/**
 * 数据库表结构定义
 * 包含所有建表 SQL 和索引 SQL
 */

/** 所有建表 SQL，按依赖顺序排列 */
export const TABLES: string[] = [
  // 迁移控制表
  `CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,

  // 长辈表
  `CREATE TABLE IF NOT EXISTS ancestors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    relationship TEXT,
    gender TEXT CHECK(gender IN ('male','female','other')),
    birth_year INTEGER,
    birth_date TEXT,
    death_year INTEGER,
    death_date TEXT,
    avatar_path TEXT,
    skill_content TEXT,
    voice_id TEXT,
    voice_engine TEXT,
    parent_id TEXT REFERENCES ancestors(id),
    spouse_id TEXT REFERENCES ancestors(id),
    generation INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,

  // 墓地位置表
  `CREATE TABLE IF NOT EXISTS grave_locations (
    id TEXT PRIMARY KEY,
    ancestor_id TEXT REFERENCES ancestors(id) ON DELETE CASCADE,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy_meters REAL,
    altitude REAL,
    address_hint TEXT,
    photo_paths TEXT,
    audio_note_path TEXT,
    recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,

  // 路线点表
  `CREATE TABLE IF NOT EXISTS route_waypoints (
    id TEXT PRIMARY KEY,
    grave_id TEXT NOT NULL REFERENCES grave_locations(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy_meters REAL,
    photo_paths TEXT NOT NULL,
    note TEXT,
    audio_note_path TEXT,
    is_endpoint INTEGER DEFAULT 0,
    recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,

  // 访谈表
  `CREATE TABLE IF NOT EXISTS interviews (
    id TEXT PRIMARY KEY,
    ancestor_id TEXT NOT NULL REFERENCES ancestors(id) ON DELETE CASCADE,
    status TEXT CHECK(status IN ('draft','in_progress','completed','distilled')) DEFAULT 'draft',
    total_questions INTEGER DEFAULT 0,
    completed_questions INTEGER DEFAULT 0,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,

  // 访谈问答表
  `CREATE TABLE IF NOT EXISTS interview_answers (
    id TEXT PRIMARY KEY,
    interview_id TEXT NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    question_index INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    theme TEXT,
    audio_path TEXT,
    transcript TEXT,
    duration_seconds REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,

  // 对话表
  `CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    ancestor_id TEXT NOT NULL REFERENCES ancestors(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,

  // 消息表
  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,

  // 习俗提醒表
  `CREATE TABLE IF NOT EXISTS ritual_reminders (
    id TEXT PRIMARY KEY,
    ancestor_id TEXT NOT NULL REFERENCES ancestors(id) ON DELETE CASCADE,
    ritual_key TEXT NOT NULL,
    ritual_name TEXT NOT NULL,
    date_solar TEXT NOT NULL,
    date_lunar TEXT,
    year_after_death INTEGER,
    todo_items TEXT,
    bring_items TEXT,
    home_notes TEXT,
    description TEXT,
    is_notified INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,
];

/** 所有索引 SQL */
export const INDEXES: string[] = [
  `CREATE INDEX IF NOT EXISTS idx_ancestors_generation ON ancestors(generation);`,
  `CREATE INDEX IF NOT EXISTS idx_grave_ancestor ON grave_locations(ancestor_id);`,
  `CREATE INDEX IF NOT EXISTS idx_waypoint_grave ON route_waypoints(grave_id);`,
  `CREATE INDEX IF NOT EXISTS idx_waypoint_order ON route_waypoints(grave_id, sort_order);`,
  `CREATE INDEX IF NOT EXISTS idx_answer_interview ON interview_answers(interview_id);`,
  `CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id);`,
  `CREATE INDEX IF NOT EXISTS idx_msg_created ON messages(created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_ritual_ancestor ON ritual_reminders(ancestor_id);`,
  `CREATE INDEX IF NOT EXISTS idx_ritual_date ON ritual_reminders(date_solar);`,
];

/** 当前 schema 版本号 */
export const CURRENT_SCHEMA_VERSION = 1;
