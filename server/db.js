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

  // Migrate legacy unscoped incident and homework IDs to user-scoped IDs & clean duplicates
  try {
    const migrateTx = targetDb.transaction(() => {
      // 1. Incidents migration
      const oldIncidents = targetDb.prepare(`
        SELECT id, user_id FROM incidents
        WHERE id LIKE 'webtop-inc-%'
      `).all();

      for (const inc of oldIncidents) {
        if (!inc.id.startsWith(`webtop-inc-${inc.user_id}-`)) {
          const newId = `webtop-inc-${inc.user_id}-${inc.id.slice('webtop-inc-'.length)}`;
          const existing = targetDb.prepare('SELECT id FROM incidents WHERE id = ?').get(newId);
          if (existing) {
            targetDb.prepare('DELETE FROM incidents WHERE id = ?').run(inc.id);
          } else {
            targetDb.prepare('UPDATE incidents SET id = ? WHERE id = ?').run(newId, inc.id);
          }
        }
      }

      // 2. Homework migration & permanent deduplication to stable canonical IDs
      const allHw = targetDb.prepare(`
        SELECT id, user_id, student_id, student_name, subject, teacher, due_date, description, lesson_subject, hour_num, completed, raw_data, created_at
        FROM homework
      `).all();

      const groupedMap = new Map();
      for (const hw of allHw) {
        const sanitizedChild = (hw.student_name || '').trim().replace(/[^\w\u0590-\u05fe]/g, '_');
        const subject = (hw.subject || 'כללי').trim();
        const sanitizedSubject = subject.replace(/[^\w\u0590-\u05fe]/g, '_');
        const hour = (hw.hour_num !== null && !isNaN(hw.hour_num)) ? hw.hour_num : '0';
        const canonicalId = `webtop-hw-${hw.user_id}-${sanitizedChild}-${hw.due_date}-${hour}-${sanitizedSubject}`;

        const groupKey = `${hw.user_id}::${(hw.student_name || '').trim()}::${hw.due_date}::${hour}::${subject}`;
        let group = groupedMap.get(groupKey);
        if (!group) {
          group = { canonicalId, bestRow: { ...hw, id: canonicalId }, idsToDelete: [] };
          groupedMap.set(groupKey, group);
        } else {
          // If any duplicate was completed, preserve completed status
          if (hw.completed) {
            group.bestRow.completed = 1;
          }
          if (!group.bestRow.description && hw.description) {
            group.bestRow.description = hw.description;
          }
        }
        if (hw.id !== canonicalId) {
          group.idsToDelete.push(hw.id);
        }
      }

      // Delete non-canonical IDs
      const deleteStmt = targetDb.prepare('DELETE FROM homework WHERE id = ?');
      for (const group of groupedMap.values()) {
        for (const oldId of group.idsToDelete) {
          deleteStmt.run(oldId);
        }
      }

      // Upsert the canonical row for each unique item
      const upsertCanonical = targetDb.prepare(`
        INSERT INTO homework (id, user_id, student_id, student_name, subject, teacher, due_date, description, lesson_subject, hour_num, completed, raw_data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          completed = MAX(homework.completed, excluded.completed),
          student_id = excluded.student_id,
          student_name = excluded.student_name,
          subject = excluded.subject,
          teacher = excluded.teacher,
          due_date = excluded.due_date,
          description = excluded.description,
          lesson_subject = excluded.lesson_subject,
          hour_num = excluded.hour_num,
          raw_data = excluded.raw_data
      `);

      for (const group of groupedMap.values()) {
        const r = group.bestRow;
        upsertCanonical.run(
          r.id, r.user_id, r.student_id, r.student_name, r.subject,
          r.teacher, r.due_date, r.description, r.lesson_subject, r.hour_num,
          r.completed ? 1 : 0, r.raw_data, r.created_at || new Date().toISOString()
        );
      }
    });
    migrateTx();
  } catch (err) {
    console.warn('Failed to run incident/homework ID migration:', err.message);
  }

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

