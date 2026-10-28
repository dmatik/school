import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'school.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Open SQLite database
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');

// Initialize schema
export function initDb(targetDb = db) {
  targetDb.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      first_name TEXT DEFAULT '',
      last_name TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
      token_version INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS authenticators (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      public_key BLOB NOT NULL,
      counter INTEGER NOT NULL DEFAULT 0,
      device_type TEXT DEFAULT 'singleDevice',
      backed_up INTEGER DEFAULT 0,
      transports TEXT DEFAULT '[]',
      device_name TEXT DEFAULT 'Passkey',
      created_at TEXT NOT NULL,
      last_used_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_authenticators_user ON authenticators(user_id);

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_id TEXT,
      student_name TEXT,
      date TEXT,
      type TEXT,
      subject TEXT,
      teacher TEXT,
      description TEXT,
      hour_num INTEGER,
      is_justified INTEGER DEFAULT 0,
      event_code INTEGER,
      raw_data TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_incidents_user ON incidents(user_id);
    CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents(user_id, date);

    CREATE TABLE IF NOT EXISTS homework (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_id TEXT,
      student_name TEXT,
      subject TEXT,
      teacher TEXT,
      due_date TEXT,
      description TEXT,
      lesson_subject TEXT,
      hour_num INTEGER,
      completed INTEGER DEFAULT 0,
      raw_data TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_homework_user ON homework(user_id);
    CREATE INDEX IF NOT EXISTS idx_homework_due_date ON homework(user_id, due_date);

    CREATE TABLE IF NOT EXISTS webtop_credentials (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      username TEXT NOT NULL,
      encrypted_password TEXT NOT NULL,
      selected_child_id TEXT,
      linked_children TEXT DEFAULT '[]',
      last_synced_at TEXT,
      sync_status TEXT DEFAULT 'idle',
      sync_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_webtop_credentials_user ON webtop_credentials(user_id);
  `);

  // Migrate existing tables if they lack new columns
  const incidentsCols = targetDb.prepare("PRAGMA table_info(incidents)").all().map(c => c.name);
  if (!incidentsCols.includes('student_id')) targetDb.exec("ALTER TABLE incidents ADD COLUMN student_id TEXT;");
  if (!incidentsCols.includes('subject')) targetDb.exec("ALTER TABLE incidents ADD COLUMN subject TEXT;");
  if (!incidentsCols.includes('hour_num')) targetDb.exec("ALTER TABLE incidents ADD COLUMN hour_num INTEGER;");
  if (!incidentsCols.includes('is_justified')) targetDb.exec("ALTER TABLE incidents ADD COLUMN is_justified INTEGER DEFAULT 0;");
  if (!incidentsCols.includes('event_code')) targetDb.exec("ALTER TABLE incidents ADD COLUMN event_code INTEGER;");

  const homeworkCols = targetDb.prepare("PRAGMA table_info(homework)").all().map(c => c.name);
  if (!homeworkCols.includes('student_id')) targetDb.exec("ALTER TABLE homework ADD COLUMN student_id TEXT;");
  if (!homeworkCols.includes('teacher')) targetDb.exec("ALTER TABLE homework ADD COLUMN teacher TEXT;");
  if (!homeworkCols.includes('lesson_subject')) targetDb.exec("ALTER TABLE homework ADD COLUMN lesson_subject TEXT;");
  if (!homeworkCols.includes('hour_num')) targetDb.exec("ALTER TABLE homework ADD COLUMN hour_num INTEGER;");

  targetDb.exec(`
    CREATE INDEX IF NOT EXISTS idx_incidents_student ON incidents(user_id, student_id);
    CREATE INDEX IF NOT EXISTS idx_homework_student ON homework(user_id, student_id);
  `);

  // Seed default admin if no users exist
  const countStmt = targetDb.prepare('SELECT COUNT(*) as count FROM users');
  const userCount = countStmt.get().count;

  if (userCount === 0) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('admin', salt);
    const now = new Date().toISOString();

    const insertAdmin = targetDb.prepare(`
      INSERT INTO users (id, username, password_hash, first_name, last_name, avatar, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertAdmin.run(
      'admin-default',
      'admin',
      passwordHash,
      'מנהל',
      'מערכת',
      '',
      'admin',
      now,
      now
    );
    console.log('Seeded default admin user: "admin"');
  }
}

export default db;

