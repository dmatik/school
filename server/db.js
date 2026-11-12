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
      family_role TEXT NOT NULL DEFAULT 'parent' CHECK(family_role IN ('parent', 'child')),
      linked_child_id TEXT DEFAULT NULL,
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
      user_id TEXT DEFAULT 'family',
      child_id TEXT,
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
    CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents(date);

    CREATE TABLE IF NOT EXISTS homework (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'family',
      child_id TEXT,
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
    CREATE INDEX IF NOT EXISTS idx_homework_due_date ON homework(due_date);

    CREATE TABLE IF NOT EXISTS webtop_credentials (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'family',
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
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'family',
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      class_code INTEGER,
      class_num INTEGER,
      cellphone TEXT,
      color TEXT,
      external_id TEXT,
      external_source TEXT NOT NULL DEFAULT 'webtop',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_children_user ON children(user_id);
    CREATE INDEX IF NOT EXISTS idx_children_external ON children(external_source, external_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_children_source_id ON children(user_id, external_source, id);

    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'family',
      child_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      date TEXT NOT NULL,
      grade TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_exams_user ON exams(user_id);
    CREATE INDEX IF NOT EXISTS idx_exams_date ON exams(date);
    CREATE INDEX IF NOT EXISTS idx_exams_child_id ON exams(child_id);

    CREATE TABLE IF NOT EXISTS schedule_lessons (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'family',
      child_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL CHECK(day_of_week >= 0 AND day_of_week <= 5),
      hour_num INTEGER NOT NULL CHECK(hour_num >= 1 AND hour_num <= 12),
      subject TEXT NOT NULL,
      teacher TEXT DEFAULT '',
      room TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(child_id, day_of_week, hour_num)
    );

    CREATE INDEX IF NOT EXISTS idx_schedule_lessons_child ON schedule_lessons(child_id);

    CREATE TABLE IF NOT EXISTS schedule_day_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'family',
      child_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL CHECK(day_of_week >= 0 AND day_of_week <= 5),
      finish_time TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(child_id, day_of_week)
    );

    CREATE INDEX IF NOT EXISTS idx_schedule_day_settings_child ON schedule_day_settings(child_id);
  `);

  // Migrate existing users table if it lacks family_role or linked_child_id
  const userCols = targetDb.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!userCols.includes('family_role')) {
    targetDb.exec("ALTER TABLE users ADD COLUMN family_role TEXT NOT NULL DEFAULT 'parent' CHECK(family_role IN ('parent', 'child'));");
  }
  if (!userCols.includes('linked_child_id')) {
    targetDb.exec("ALTER TABLE users ADD COLUMN linked_child_id TEXT DEFAULT NULL;");
  }
  // Admin user can only be parent
  targetDb.exec("UPDATE users SET family_role = 'parent', linked_child_id = NULL WHERE role = 'admin';");

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

  const examsCols = targetDb.prepare("PRAGMA table_info(exams)").all().map(c => c.name);
  if (!examsCols.includes('description')) targetDb.exec("ALTER TABLE exams ADD COLUMN description TEXT DEFAULT '';");

  targetDb.exec(`
    CREATE INDEX IF NOT EXISTS idx_incidents_student ON incidents(user_id, student_id);
    CREATE INDEX IF NOT EXISTS idx_incidents_child_id ON incidents(user_id, child_id);
    CREATE INDEX IF NOT EXISTS idx_homework_student ON homework(user_id, student_id);
    CREATE INDEX IF NOT EXISTS idx_homework_child_id ON homework(user_id, child_id);
  `);

  // Migrate legacy unscoped incident and homework IDs to user-scoped IDs & clean duplicates
  try {
    const migrateTx = targetDb.transaction(() => {
      // 1. Incidents migration & cross-user family deduplication
      const oldIncidents = targetDb.prepare(`
        SELECT id, user_id, child_id, student_id, student_name, date, type, subject, hour_num, event_code, raw_data
        FROM incidents
      `).all();

      for (const inc of oldIncidents) {
        if (inc.id.startsWith('webtop-inc-') && !inc.id.startsWith(`webtop-inc-${inc.user_id}-`)) {
          const newId = `webtop-inc-${inc.user_id}-${inc.id.slice('webtop-inc-'.length)}`;
          const existing = targetDb.prepare('SELECT id FROM incidents WHERE id = ?').get(newId);
          if (existing) {
            targetDb.prepare('DELETE FROM incidents WHERE id = ?').run(inc.id);
            inc.id = null;
          } else {
            targetDb.prepare('UPDATE incidents SET id = ? WHERE id = ?').run(newId, inc.id);
            inc.id = newId;
          }
        }
      }

      // Deduplicate incidents where 'family' and legacy user-scoped (e.g. 'admin-default') rows coexist for the same event
      const activeIncidents = targetDb.prepare(`
        SELECT id, user_id, child_id, student_id, student_name, date, type, subject, hour_num, event_code, raw_data
        FROM incidents
      `).all();

      const hasFamilyIncidents = activeIncidents.some(i => i.user_id === 'family');
      if (hasFamilyIncidents) {
        const incByEventKey = new Map();
        for (const inc of activeIncidents) {
          let eventId = null;
          if (inc.raw_data) {
            try {
              const parsed = JSON.parse(inc.raw_data);
              if (parsed && parsed.eventID) eventId = String(parsed.eventID);
            } catch {}
          }
          if (!eventId && inc.id.startsWith(`webtop-inc-${inc.user_id}-`)) {
            eventId = inc.id.slice(`webtop-inc-${inc.user_id}-`.length);
          }
          const key = eventId
            ? `ev::${eventId}`
            : `comp::${inc.child_id || inc.student_name || ''}::${inc.date || ''}::${inc.type || ''}::${inc.subject || ''}::${inc.hour_num ?? ''}::${inc.event_code ?? ''}`;

          if (!incByEventKey.has(key)) {
            incByEventKey.set(key, []);
          }
          incByEventKey.get(key).push({ ...inc, eventId });
        }

        for (const group of incByEventKey.values()) {
          const familyRow = group.find(r => r.user_id === 'family');
          if (familyRow) {
            // Delete any duplicate non-family rows for the same event
            for (const other of group) {
              if (other.id !== familyRow.id) {
                targetDb.prepare('DELETE FROM incidents WHERE id = ?').run(other.id);
              }
            }
          } else if (group.length > 0 && group[0].user_id === 'admin-default') {
            // Normalize legacy admin-default Webtop incidents to 'family'
            const primary = group[0];
            const canonicalId = primary.eventId ? `webtop-inc-family-${primary.eventId}` : primary.id;
            const collision = targetDb.prepare('SELECT id FROM incidents WHERE id = ?').get(canonicalId);
            if (!collision) {
              targetDb.prepare('UPDATE incidents SET id = ?, user_id = ? WHERE id = ?').run(canonicalId, 'family', primary.id);
            } else if (collision.id !== primary.id) {
              targetDb.prepare('DELETE FROM incidents WHERE id = ?').run(primary.id);
            }
            for (let i = 1; i < group.length; i++) {
              targetDb.prepare('DELETE FROM incidents WHERE id = ?').run(group[i].id);
            }
          }
        }
      }

      // 2. Homework migration & permanent deduplication to stable canonical IDs
      const allHw = targetDb.prepare(`
        SELECT id, user_id, child_id, student_id, student_name, subject, teacher, due_date, description, lesson_subject, hour_num, completed, raw_data, created_at
        FROM homework
      `).all();

      const hasFamilyHw = allHw.some(h => h.user_id === 'family');
      const groupedMap = new Map();
      for (const hw of allHw) {
        // If family-scoped homework exists, normalize legacy 'admin-default' Webtop homework into 'family' to eliminate duplicates
        const effectiveUserId = (hasFamilyHw && hw.user_id === 'admin-default') ? 'family' : hw.user_id;
        const sanitizedChild = (hw.student_name || '').trim().replace(/[^\w\u0590-\u05fe]/g, '_');
        const subject = (hw.subject || 'כללי').trim();
        const sanitizedSubject = subject.replace(/[^\w\u0590-\u05fe]/g, '_');
        const hour = (hw.hour_num !== null && !isNaN(hw.hour_num)) ? hw.hour_num : '0';
        const canonicalId = `webtop-hw-${effectiveUserId}-${sanitizedChild}-${hw.due_date}-${hour}-${sanitizedSubject}`;

        const groupKey = `${effectiveUserId}::${(hw.student_name || '').trim()}::${hw.due_date}::${hour}::${subject}`;
        let group = groupedMap.get(groupKey);
        if (!group) {
          group = { canonicalId, bestRow: { ...hw, id: canonicalId, user_id: effectiveUserId }, idsToDelete: [] };
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
        const childrenSql = targetDb.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='children'").get()?.sql || '';
        const conflictTarget = childrenSql.includes('UNIQUE(user_id, external_source, id)') || childrenSql.includes('UNIQUE (user_id, external_source, id)')
          ? '(user_id, external_source, id)'
          : '(id)';
        const upsertChild = targetDb.prepare(`
          INSERT INTO children (id, user_id, first_name, last_name, class_code, class_num, cellphone, color, external_id, external_source, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'webtop', ?, ?)
          ON CONFLICT ${conflictTarget} DO UPDATE SET
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

  // Deduplicate children records caused by ID hashing changes (e.g. 16-hex to 32-hex)
  try {
    const dedupeTx = targetDb.transaction(() => {
      const allChildren = targetDb.prepare('SELECT * FROM children').all();
      // Group by user_id and normalized identity
      const groups = new Map();
      for (const ch of allChildren) {
        const canonicalId = generateChildId(ch.first_name, ch.last_name);
        const groupKey = `${ch.user_id}:${ch.external_source || 'webtop'}:${canonicalId}`;
        if (!groups.has(groupKey)) {
          groups.set(groupKey, { canonicalId, items: [] });
        }
        groups.get(groupKey).items.push(ch);
      }

      for (const { canonicalId, items } of groups.values()) {
        if (items.length <= 1) continue;

        // Find the canonical item (if present) or pick the newest/best one
        let canonicalItem = items.find(i => i.id === canonicalId);
        if (!canonicalItem) {
          canonicalItem = items[0];
        }

        // Merge properties from other items into canonicalItem
        for (const other of items) {
          if (other.id === canonicalItem.id) continue;

          // Merge color if canonicalItem has none
          if (!canonicalItem.color && other.color) {
            targetDb.prepare('UPDATE children SET color = ? WHERE user_id = ? AND id = ?').run(
              other.color,
              canonicalItem.user_id,
              canonicalItem.id
            );
            canonicalItem.color = other.color;
          }

          // Merge other fields if missing
          if (!canonicalItem.external_id && other.external_id) {
            targetDb.prepare('UPDATE children SET external_id = ? WHERE user_id = ? AND id = ?').run(
              other.external_id,
              canonicalItem.user_id,
              canonicalItem.id
            );
          }
          if (!canonicalItem.cellphone && other.cellphone) {
            targetDb.prepare('UPDATE children SET cellphone = ? WHERE user_id = ? AND id = ?').run(
              other.cellphone,
              canonicalItem.user_id,
              canonicalItem.id
            );
          }
          if (!canonicalItem.class_code && other.class_code) {
            targetDb.prepare('UPDATE children SET class_code = ?, class_num = ? WHERE user_id = ? AND id = ?').run(
              other.class_code,
              other.class_num,
              canonicalItem.user_id,
              canonicalItem.id
            );
          }

          // Update references in webtop_credentials
          targetDb.prepare(`
            UPDATE webtop_credentials
            SET selected_child_id = ?
            WHERE user_id = ? AND selected_child_id = ?
          `).run(canonicalItem.id, canonicalItem.user_id, other.id);

          // Update references in incidents
          targetDb.prepare(`
            UPDATE incidents
            SET child_id = ?
            WHERE user_id = ? AND child_id = ?
          `).run(canonicalItem.id, canonicalItem.user_id, other.id);

          // Update references in homework
          targetDb.prepare(`
            UPDATE homework
            SET child_id = ?
            WHERE user_id = ? AND child_id = ?
          `).run(canonicalItem.id, canonicalItem.user_id, other.id);

          // Update references in schedule_lessons
          targetDb.prepare(`
            UPDATE schedule_lessons
            SET child_id = ?
            WHERE child_id = ?
          `).run(canonicalItem.id, other.id);

          // Update references in schedule_day_settings
          targetDb.prepare(`
            UPDATE schedule_day_settings
            SET child_id = ?
            WHERE child_id = ?
          `).run(canonicalItem.id, other.id);

          // Delete obsolete duplicate child
          targetDb.prepare('DELETE FROM children WHERE user_id = ? AND id = ?').run(
            other.user_id,
            other.id
          );
        }
      }

      // Add unique constraint on name per user & external_source so duplicates can never re-occur
      targetDb.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_children_name_unique
        ON children(user_id, external_source, lower(trim(first_name)), lower(trim(last_name)));
      `);
    });
    dedupeTx();
  } catch (dedupeErr) {
    console.warn('Failed to deduplicate children table:', dedupeErr.message);
  }

  // Ensure children, webtop_credentials, incidents, and homework do not cascade delete from users
  const childrenFks = targetDb.prepare("PRAGMA foreign_key_list(children)").all();
  const childrenSql = targetDb.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='children'").get()?.sql || '';
  if (childrenFks.some(fk => fk.table === 'users') || childrenSql.includes('PRIMARY KEY (user_id, id)') || childrenSql.includes('PRIMARY KEY(user_id, id)')) {
    targetDb.transaction(() => {
      targetDb.exec(`
        CREATE TABLE IF NOT EXISTS children_new (
          id TEXT PRIMARY KEY,
          user_id TEXT DEFAULT 'family',
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          class_code INTEGER,
          class_num INTEGER,
          cellphone TEXT,
          color TEXT,
          external_id TEXT,
          external_source TEXT NOT NULL DEFAULT 'webtop',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT OR REPLACE INTO children_new (id, user_id, first_name, last_name, class_code, class_num, cellphone, color, external_id, external_source, created_at, updated_at)
        SELECT id, coalesce(user_id, 'family'), first_name, last_name, class_code, class_num, cellphone, color, external_id, external_source, created_at, updated_at FROM children;
        DROP TABLE children;
        ALTER TABLE children_new RENAME TO children;
        CREATE INDEX IF NOT EXISTS idx_children_user ON children(user_id);
        CREATE INDEX IF NOT EXISTS idx_children_external ON children(external_source, external_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_children_source_id ON children(user_id, external_source, id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_children_name_unique
        ON children(user_id, external_source, lower(trim(first_name)), lower(trim(last_name)));
      `);
    })();
  }

  const credFks = targetDb.prepare("PRAGMA foreign_key_list(webtop_credentials)").all();
  if (credFks.some(fk => fk.table === 'users')) {
    targetDb.transaction(() => {
      targetDb.exec(`
        CREATE TABLE IF NOT EXISTS webtop_credentials_new (
          id TEXT PRIMARY KEY,
          user_id TEXT DEFAULT 'family',
          username TEXT NOT NULL,
          encrypted_password TEXT NOT NULL,
          selected_child_id TEXT,
          last_synced_at TEXT,
          sync_status TEXT DEFAULT 'idle',
          sync_error TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT OR REPLACE INTO webtop_credentials_new (id, user_id, username, encrypted_password, selected_child_id, last_synced_at, sync_status, sync_error, created_at, updated_at)
        SELECT id, coalesce(user_id, 'family'), username, encrypted_password, selected_child_id, last_synced_at, sync_status, sync_error, created_at, updated_at FROM webtop_credentials;
        DROP TABLE webtop_credentials;
        ALTER TABLE webtop_credentials_new RENAME TO webtop_credentials;
        CREATE INDEX IF NOT EXISTS idx_webtop_credentials_user ON webtop_credentials(user_id);
      `);
    })();
  }

  // Auto-sync state (production-only feature; columns are harmless elsewhere)
  const credAutoCols = targetDb.prepare("PRAGMA table_info(webtop_credentials)").all().map(c => c.name);
  if (!credAutoCols.includes('auto_sync_enabled')) targetDb.exec("ALTER TABLE webtop_credentials ADD COLUMN auto_sync_enabled INTEGER NOT NULL DEFAULT 1;");
  if (!credAutoCols.includes('consecutive_failures')) targetDb.exec("ALTER TABLE webtop_credentials ADD COLUMN consecutive_failures INTEGER NOT NULL DEFAULT 0;");
  if (!credAutoCols.includes('next_sync_at')) targetDb.exec("ALTER TABLE webtop_credentials ADD COLUMN next_sync_at TEXT;");
  if (!credAutoCols.includes('auto_sync_paused_reason')) targetDb.exec("ALTER TABLE webtop_credentials ADD COLUMN auto_sync_paused_reason TEXT;");

  const incFks = targetDb.prepare("PRAGMA foreign_key_list(incidents)").all();
  if (incFks.some(fk => fk.table === 'users')) {
    targetDb.transaction(() => {
      targetDb.exec(`
        CREATE TABLE IF NOT EXISTS incidents_new (
          id TEXT PRIMARY KEY,
          user_id TEXT DEFAULT 'family',
          child_id TEXT,
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
        INSERT OR REPLACE INTO incidents_new (id, user_id, child_id, student_id, student_name, date, type, subject, teacher, description, hour_num, is_justified, event_code, raw_data, created_at)
        SELECT id, coalesce(user_id, 'family'), child_id, student_id, student_name, date, type, subject, teacher, description, hour_num, is_justified, event_code, raw_data, created_at FROM incidents;
        DROP TABLE incidents;
        ALTER TABLE incidents_new RENAME TO incidents;
        CREATE INDEX IF NOT EXISTS idx_incidents_user ON incidents(user_id);
        CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents(date);
        CREATE INDEX IF NOT EXISTS idx_incidents_child_id ON incidents(child_id);
        CREATE INDEX IF NOT EXISTS idx_incidents_student ON incidents(student_id);
      `);
    })();
  }

  const hwFks = targetDb.prepare("PRAGMA foreign_key_list(homework)").all();
  if (hwFks.some(fk => fk.table === 'users')) {
    targetDb.transaction(() => {
      targetDb.exec(`
        CREATE TABLE IF NOT EXISTS homework_new (
          id TEXT PRIMARY KEY,
          user_id TEXT DEFAULT 'family',
          child_id TEXT,
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
        INSERT OR REPLACE INTO homework_new (id, user_id, child_id, student_id, student_name, subject, teacher, due_date, description, lesson_subject, hour_num, completed, raw_data, created_at)
        SELECT id, coalesce(user_id, 'family'), child_id, student_id, student_name, subject, teacher, due_date, description, lesson_subject, hour_num, completed, raw_data, created_at FROM homework;
        DROP TABLE homework;
        ALTER TABLE homework_new RENAME TO homework;
        CREATE INDEX IF NOT EXISTS idx_homework_user ON homework(user_id);
        CREATE INDEX IF NOT EXISTS idx_homework_due_date ON homework(due_date);
        CREATE INDEX IF NOT EXISTS idx_homework_child_id ON homework(child_id);
        CREATE INDEX IF NOT EXISTS idx_homework_student ON homework(student_id);
      `);
    })();
  }

  // Seed default admin if no users exist
  const countStmt = targetDb.prepare('SELECT COUNT(*) as count FROM users');
  const userCount = countStmt.get().count;

  if (userCount === 0) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('admin', salt);
    const now = new Date().toISOString();

    const insertAdmin = targetDb.prepare(`
      INSERT INTO users (id, username, password_hash, first_name, last_name, avatar, role, family_role, linked_child_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'parent', NULL, ?, ?)
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

