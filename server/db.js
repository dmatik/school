import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { generateChildId } from './webtop.js';

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
      last_synced_at TEXT,
      sync_status TEXT DEFAULT 'idle',
      sync_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_webtop_credentials_user ON webtop_credentials(user_id);

    CREATE TABLE IF NOT EXISTS children (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      class_code INTEGER,
      class_num INTEGER,
      cellphone TEXT,
      color TEXT,
      external_id TEXT,
      external_source TEXT NOT NULL DEFAULT 'webtop',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, id),
      UNIQUE(user_id, external_source, id)
    );

    CREATE INDEX IF NOT EXISTS idx_children_user ON children(user_id);
    CREATE INDEX IF NOT EXISTS idx_children_external ON children(user_id, external_source, external_id);
  `);

  // Ensure children table has composite primary key (user_id, id)
  const childrenSql = targetDb.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='children'").get()?.sql || '';
  if (childrenSql && !childrenSql.includes('PRIMARY KEY (user_id, id)') && !childrenSql.includes('PRIMARY KEY(user_id, id)')) {
    targetDb.exec(`
      CREATE TABLE IF NOT EXISTS children_new (
        id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        class_code INTEGER,
        class_num INTEGER,
        cellphone TEXT,
        color TEXT,
        external_id TEXT,
        external_source TEXT NOT NULL DEFAULT 'webtop',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, id),
        UNIQUE(user_id, external_source, id)
      );
      INSERT OR REPLACE INTO children_new SELECT * FROM children;
      DROP TABLE children;
      ALTER TABLE children_new RENAME TO children;
      CREATE INDEX IF NOT EXISTS idx_children_user ON children(user_id);
      CREATE INDEX IF NOT EXISTS idx_children_external ON children(user_id, external_source, external_id);
    `);
  }

  // Migrate existing tables if they lack new columns
  const incidentsCols = targetDb.prepare("PRAGMA table_info(incidents)").all().map(c => c.name);
  if (!incidentsCols.includes('student_id')) targetDb.exec("ALTER TABLE incidents ADD COLUMN student_id TEXT;");
  if (!incidentsCols.includes('child_id')) targetDb.exec("ALTER TABLE incidents ADD COLUMN child_id TEXT;");
  if (!incidentsCols.includes('subject')) targetDb.exec("ALTER TABLE incidents ADD COLUMN subject TEXT;");
  if (!incidentsCols.includes('hour_num')) targetDb.exec("ALTER TABLE incidents ADD COLUMN hour_num INTEGER;");
  if (!incidentsCols.includes('is_justified')) targetDb.exec("ALTER TABLE incidents ADD COLUMN is_justified INTEGER DEFAULT 0;");
  if (!incidentsCols.includes('event_code')) targetDb.exec("ALTER TABLE incidents ADD COLUMN event_code INTEGER;");

  const homeworkCols = targetDb.prepare("PRAGMA table_info(homework)").all().map(c => c.name);
  if (!homeworkCols.includes('student_id')) targetDb.exec("ALTER TABLE homework ADD COLUMN student_id TEXT;");
  if (!homeworkCols.includes('child_id')) targetDb.exec("ALTER TABLE homework ADD COLUMN child_id TEXT;");
  if (!homeworkCols.includes('teacher')) targetDb.exec("ALTER TABLE homework ADD COLUMN teacher TEXT;");
  if (!homeworkCols.includes('lesson_subject')) targetDb.exec("ALTER TABLE homework ADD COLUMN lesson_subject TEXT;");
  if (!homeworkCols.includes('hour_num')) targetDb.exec("ALTER TABLE homework ADD COLUMN hour_num INTEGER;");

  targetDb.exec(`
    CREATE INDEX IF NOT EXISTS idx_incidents_student ON incidents(user_id, student_id);
    CREATE INDEX IF NOT EXISTS idx_incidents_child_id ON incidents(user_id, child_id);
    CREATE INDEX IF NOT EXISTS idx_homework_student ON homework(user_id, student_id);
    CREATE INDEX IF NOT EXISTS idx_homework_child_id ON homework(user_id, child_id);
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
        SELECT id, user_id, child_id, student_id, student_name, subject, teacher, due_date, description, lesson_subject, hour_num, completed, raw_data, created_at
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
          if (!group.bestRow.child_id && hw.child_id) {
            group.bestRow.child_id = hw.child_id;
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
        INSERT INTO homework (id, user_id, child_id, student_id, student_name, subject, teacher, due_date, description, lesson_subject, hour_num, completed, raw_data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          completed = MAX(homework.completed, excluded.completed),
          child_id = coalesce(homework.child_id, excluded.child_id),
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
          r.id, r.user_id, r.child_id || null, r.student_id, r.student_name, r.subject,
          r.teacher, r.due_date, r.description, r.lesson_subject, r.hour_num,
          r.completed ? 1 : 0, r.raw_data, r.created_at || new Date().toISOString()
        );
      }
    });
    migrateTx();
  } catch (err) {
    console.warn('Failed to run incident/homework ID migration:', err.message);
  }

  // Backfill children table from webtop_credentials (if linked_children exists) and child_settings
  try {
    const credCols = targetDb.prepare("PRAGMA table_info(webtop_credentials)").all().map(c => c.name);
    if (credCols.includes('linked_children')) {
      const backfillTx = targetDb.transaction(() => {
        const credRows = targetDb.prepare('SELECT user_id, linked_children FROM webtop_credentials').all();
        const upsertChild = targetDb.prepare(`
          INSERT INTO children (id, user_id, first_name, last_name, class_code, class_num, cellphone, color, external_id, external_source, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'webtop', ?, ?)
          ON CONFLICT(user_id, external_source, id) DO UPDATE SET
            class_code = coalesce(excluded.class_code, children.class_code),
            class_num = coalesce(excluded.class_num, children.class_num),
            cellphone = coalesce(excluded.cellphone, children.cellphone),
            color = coalesce(children.color, excluded.color),
            external_id = coalesce(excluded.external_id, children.external_id),
            updated_at = excluded.updated_at
        `);

        // Helper map of colors from child_settings
        const settingsMap = new Map();
        try {
          const sRows = targetDb.prepare('SELECT user_id, child_name, color FROM child_settings').all();
          for (const s of sRows) {
            settingsMap.set(`${s.user_id}:${s.child_name.trim().toLowerCase()}`, s.color);
          }
        } catch {}

        for (const cred of credRows) {
          if (!cred.linked_children) continue;
          try {
            const childrenList = JSON.parse(cred.linked_children);
            const now = new Date().toISOString();
            for (const c of childrenList) {
              if (!c.firstName && !c.lastName) continue;
              const childId = generateChildId(c.firstName, c.lastName);
              const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim();
              const colorFromSettings = settingsMap.get(`${cred.user_id}:${fullName.toLowerCase()}`);
              const effectiveColor = colorFromSettings || c.color || null;

              upsertChild.run(
                childId,
                cred.user_id,
                (c.firstName || '').trim(),
                (c.lastName || '').trim(),
                c.classCode || null,
                c.classNum || null,
                c.cellphone || null,
                effectiveColor,
                c.id || null,
                now,
                now
              );
            }
          } catch (parseErr) {
            console.warn('Failed to parse linked_children JSON for user:', cred.user_id, parseErr.message);
          }
        }

        // Drop obsolete linked_children column from webtop_credentials inside transaction
        targetDb.exec('ALTER TABLE webtop_credentials DROP COLUMN linked_children;');
      });
      backfillTx();
    }

    // Backfill child_id on incidents and homework
    const linkTx = targetDb.transaction(() => {
      const allChildren = targetDb.prepare('SELECT id, user_id, first_name, last_name, external_id FROM children').all();
      const updateIncidentStmt = targetDb.prepare(`
        UPDATE incidents
        SET child_id = ?
        WHERE user_id = ? AND (student_name = ? OR student_id = ? OR student_id = ?) AND (child_id IS NULL OR child_id != ?)
      `);
      const updateHomeworkStmt = targetDb.prepare(`
        UPDATE homework
        SET child_id = ?
        WHERE user_id = ? AND (student_name = ? OR student_id = ? OR student_id = ?) AND (child_id IS NULL OR child_id != ?)
      `);

      for (const ch of allChildren) {
        const fullName = `${ch.first_name} ${ch.last_name}`.trim();
        updateIncidentStmt.run(ch.id, ch.user_id, fullName, ch.id, ch.external_id || '', ch.id);
        updateHomeworkStmt.run(ch.id, ch.user_id, fullName, ch.id, ch.external_id || '', ch.id);
      }
    });
    linkTx();
  } catch (migErr) {
    console.warn('Failed to backfill children table:', migErr.message);
  }

  // Cleanup obsolete child_settings table if it exists
  try {
    targetDb.exec('DROP TABLE IF EXISTS child_settings;');
  } catch (dropErr) {
    console.warn('Failed to drop obsolete child_settings table:', dropErr.message);
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

