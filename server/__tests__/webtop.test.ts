import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import Database from 'better-sqlite3';
import { encryptPassword, decryptPassword, encryptWebtopPayload, getWebtopStudyYear, matchChildWithPrevious, generateChildId, generateIncidentId } from '../webtop.js';
import { initDb } from '../db.js';

describe('Webtop Cryptographic & Academic Utilities', () => {
  it('encrypts and decrypts passwords reliably using AES-256-GCM', () => {
    const originalPassword = 'MySecretSchoolPassword#2026!';
    const encrypted = encryptPassword(originalPassword);

    expect(encrypted).not.toBe(originalPassword);
    expect(encrypted).toContain(':');
    const parts = encrypted.split(':');
    expect(parts.length).toBe(3);

    const decrypted = decryptPassword(encrypted);
    expect(decrypted).toBe(originalPassword);
  });

  it('rejects tampered or malformed cipher text', () => {
    expect(() => decryptPassword('invalid-cipher-format')).toThrow('Invalid encrypted password format');

    const encrypted = encryptPassword('validPassword');
    const parts = encrypted.split(':');
    const tampered = `${parts[0]}:${parts[1]}:bad${parts[2].slice(3)}`;
    expect(() => decryptPassword(tampered)).toThrow();
  });

  it('decrypts legacy passwords encrypted with the backward-compatible fallback secret', () => {
    const legacyCipher = '7a088ab05a1902f886ab8f5d:2ba3d0f0771bf1792b28756c9f832663:c64064314f35f61474f00b6b729a7b';
    const decrypted = decryptPassword(legacyCipher);
    expect(decrypted).toBeDefined();
    expect(decrypted.length).toBeGreaterThan(0);
  });

  it('encrypts string payloads for Webtop server using AES-256-CBC', () => {
    const encrypted = encryptWebtopPayload('testuser0');
    expect(typeof encrypted).toBe('string');
    expect(encrypted.length).toBeGreaterThan(0);
    expect(/^[A-Za-z0-9+/=]+$/.test(encrypted)).toBe(true);
  });

  it('correctly calculates the Webtop studyYear across months', () => {
    expect(getWebtopStudyYear(new Date('2025-10-15'))).toBe(2026);
    expect(getWebtopStudyYear(new Date('2025-09-01'))).toBe(2026);
    expect(getWebtopStudyYear(new Date('2026-01-10'))).toBe(2026);
    expect(getWebtopStudyYear(new Date('2026-06-20'))).toBe(2026);
    expect(getWebtopStudyYear(new Date('2026-09-01'))).toBe(2027);
  });
});

describe('Webtop Database & Data Models', () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        first_name TEXT DEFAULT '',
        last_name TEXT DEFAULT '',
        avatar TEXT DEFAULT '',
        role TEXT NOT NULL,
        token_version INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE webtop_credentials (
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

      CREATE TABLE incidents (
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

      CREATE TABLE homework (
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

      CREATE TABLE children (
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
    `);

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (id, username, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('user-1', 'parent1', 'hash', 'user', now, now);
  });

  afterEach(() => {
    db.close();
  });

  it('stores and retrieves encrypted Webtop credentials without leaking plaintext', () => {
    const plainPass = 'schoolPass123';
    const encrypted = encryptPassword(plainPass);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO webtop_credentials (id, user_id, username, encrypted_password, selected_child_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('cred-1', 'user-1', 'webtop_user_test', encrypted, 'child-1', now, now);

    const row = db.prepare('SELECT * FROM webtop_credentials WHERE user_id = ?').get('user-1') as any;
    expect(row).toBeDefined();
    expect(row.username).toBe('webtop_user_test');
    expect(row.encrypted_password).not.toBe(plainPass);
    expect(decryptPassword(row.encrypted_password)).toBe(plainPass);
    expect(row.selected_child_id).toBe('child-1');
  });

  it('cascades deletion of webtop_credentials, children, incidents, and homework when user is deleted', () => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO webtop_credentials (id, user_id, username, encrypted_password, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('cred-1', 'user-1', 'test_user', 'enc', now, now);

    db.prepare(`
      INSERT INTO children (id, user_id, first_name, last_name, class_code, class_num, color, external_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('child_1', 'user-1', 'כפיר', 'טרוסמן', 4, 2, 'blue', 'ext-1', now, now);

    db.prepare(`
      INSERT INTO incidents (id, user_id, student_id, student_name, date, type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('inc-1', 'user-1', 'child-1', 'Kfir', '2026-10-27', 'Discipline', now);

    db.prepare(`
      INSERT INTO homework (id, user_id, student_id, student_name, subject, due_date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('hw-1', 'user-1', 'child-1', 'Kfir', 'Math', '2026-10-27', now);

    db.prepare('DELETE FROM users WHERE id = ?').run('user-1');

    expect(db.prepare('SELECT COUNT(*) as count FROM webtop_credentials').get()).toEqual({ count: 0 });
    expect(db.prepare('SELECT COUNT(*) as count FROM children').get()).toEqual({ count: 0 });
    expect(db.prepare('SELECT COUNT(*) as count FROM incidents').get()).toEqual({ count: 0 });
    expect(db.prepare('SELECT COUNT(*) as count FROM homework').get()).toEqual({ count: 0 });
  });

  it('filters incidents and homework by child_id and toggles homework completion', () => {
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO incidents (id, user_id, student_id, student_name, date, type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'inc-1', 'user-1', 'child-1', 'Child One', '2026-10-27', 'Late', now,
      'inc-2', 'user-1', 'child-2', 'Child Two', '2026-10-27', 'Absent', now
    );

    const child1Incidents = db.prepare('SELECT * FROM incidents WHERE user_id = ? AND student_id = ?').all('user-1', 'child-1');
    expect(child1Incidents).toHaveLength(1);
    expect((child1Incidents[0] as any).student_name).toBe('Child One');

    db.prepare(`
      INSERT INTO homework (id, user_id, student_id, student_name, subject, due_date, completed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).run('hw-1', 'user-1', 'child-1', 'Child One', 'Hebrew', '2026-10-27', now);

    const initialHw = db.prepare('SELECT completed FROM homework WHERE id = ?').get('hw-1') as any;
    expect(initialHw.completed).toBe(0);

    db.prepare('UPDATE homework SET completed = 1 WHERE id = ?').run('hw-1');
    const toggledHw = db.prepare('SELECT completed FROM homework WHERE id = ?').get('hw-1') as any;
    expect(toggledHw.completed).toBe(1);
  });

  it('migrates legacy unscoped IDs to user-scoped IDs and eliminates duplicates', () => {
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO incidents (id, user_id, student_id, student_name, date, type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('webtop-inc-1001', 'user-1', 'child-1', 'Child One', '2026-10-27', 'Late', now);
    db.prepare(`
      INSERT INTO incidents (id, user_id, student_id, student_name, date, type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('webtop-inc-user-1-1001', 'user-1', 'child-1', 'Child One', '2026-10-27', 'Late', now);

    db.prepare(`
      INSERT INTO incidents (id, user_id, student_id, student_name, date, type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('webtop-inc-1002', 'user-1', 'child-1', 'Child One', '2026-10-27', 'Discipline', now);

    db.prepare(`
      INSERT INTO homework (id, user_id, student_id, student_name, subject, due_date, hour_num, completed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)
    `).run('webtop-hw-child-1-2026-10-28-1-math', 'user-1', 'child-1', 'Child One', 'Math', '2026-10-28', now);
    db.prepare(`
      INSERT INTO homework (id, user_id, student_id, student_name, subject, due_date, hour_num, completed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?)
    `).run('webtop-hw-user-1-child-1-2026-10-28-1-math', 'user-1', 'child-1', 'Child One', 'Math', '2026-10-28', now);

    initDb(db);

    const incidents = db.prepare('SELECT id FROM incidents WHERE user_id = ?').all('user-1') as any[];
    expect(incidents).toHaveLength(2);
    expect(incidents.map((i) => i.id).sort()).toEqual([
      generateIncidentId({ userId: 'user-1', studentName: 'Child One', date: '2026-10-27', type: 'Late' }),
      generateIncidentId({ userId: 'user-1', studentName: 'Child One', date: '2026-10-27', type: 'Discipline' }),
    ].sort());

    const homework = db.prepare('SELECT id, completed FROM homework WHERE user_id = ?').all('user-1') as any[];
    expect(homework).toHaveLength(1);
    expect(homework[0].id).toBe('webtop-hw-user-1-Child_One-2026-10-28-1-Math');
    expect(homework[0].completed).toBe(1);
  });

  it('deduplicates cross-user legacy admin-default and family incidents and homework via initDb()', () => {
    const now = new Date().toISOString();

    db.prepare(`
      INSERT OR IGNORE INTO users (id, username, password_hash, role, created_at, updated_at)
      VALUES ('admin-default', 'admin', 'hash', 'admin', ?, ?),
             ('family', 'family_placeholder', 'hash', 'user', ?, ?)
    `).run(now, now, now, now);

    const rawEv = JSON.stringify({ eventID: 14504350, eventType: 'אי הכנת ש``ב', subjectName: 'עברית' });
    db.prepare(`
      INSERT INTO incidents (id, user_id, student_id, student_name, date, type, subject, hour_num, event_code, raw_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('webtop-inc-admin-default-14504350', 'admin-default', 'child-1', 'כפיר טרוסמן', '2026-10-19', 'אי הכנת ש``ב', 'עברית', 3, 781543, rawEv, now);
    db.prepare(`
      INSERT INTO incidents (id, user_id, student_id, student_name, date, type, subject, hour_num, event_code, raw_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('webtop-inc-family-14504350', 'family', 'child-1', 'כפיר טרוסמן', '2026-10-19', 'אי הכנת ש``ב', 'עברית', 3, 781543, rawEv, now);

    const rawOldEv = JSON.stringify({ eventID: 5798619, eventType: 'אי הבאת ציוד', subjectName: 'חנ``ג' });
    db.prepare(`
      INSERT INTO incidents (id, user_id, student_id, student_name, date, type, subject, hour_num, event_code, raw_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('webtop-inc-admin-default-5798619', 'admin-default', 'child-1', 'כפיר טרוסמן', '2026-09-18', 'אי הבאת ציוד', 'חנ``ג', 4, 781546, rawOldEv, now);

    db.prepare(`
      INSERT INTO homework (id, user_id, student_id, student_name, subject, due_date, hour_num, completed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 2, 1, ?)
    `).run('webtop-hw-admin-default-כפיר_טרוסמן-2026-10-30-2-אנגלית', 'admin-default', 'child-1', 'כפיר טרוסמן', 'אנגלית', '2026-10-30', now);
    db.prepare(`
      INSERT INTO homework (id, user_id, student_id, student_name, subject, due_date, hour_num, completed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 2, 0, ?)
    `).run('webtop-hw-family-כפיר_טרוסמן-2026-10-30-2-אנגלית', 'family', 'child-1', 'כפיר טרוסמן', 'אנגלית', '2026-10-30', now);

    initDb(db);

    const allIncidents = db.prepare('SELECT id, user_id FROM incidents ORDER BY id ASC').all() as any[];
    expect(allIncidents).toEqual([
      { id: generateIncidentId({ userId: 'family', studentName: 'כפיר טרוסמן', date: '2026-10-19', hourNum: 3, subject: 'עברית', type: 'אי הכנת ש``ב' }), user_id: 'family' },
      { id: generateIncidentId({ userId: 'family', studentName: 'כפיר טרוסמן', date: '2026-09-18', hourNum: 4, subject: 'חנ``ג', type: 'אי הבאת ציוד' }), user_id: 'family' },
    ].sort((a, b) => a.id.localeCompare(b.id)));

    const allHw = db.prepare('SELECT id, user_id, completed FROM homework').all() as any[];
    expect(allHw).toEqual([
      { id: 'webtop-hw-family-כפיר_טרוסמן-2026-10-30-2-אנגלית', user_id: 'family', completed: 1 },
    ]);
  });

  it('generates deterministic incident IDs and deduplicates family rows with rotated Webtop eventIDs via initDb()', () => {
    const id1 = generateIncidentId({
      userId: 'family',
      studentName: 'כפיר טרוסמן',
      date: '2026-11-13',
      hourNum: 2,
      subject: 'אנגלית',
      type: 'אי הכנת ש``ב',
    });
    const id1Whitespace = generateIncidentId({
      userId: 'family',
      studentName: ' כפיר   טרוסמן ',
      date: '2026-11-13',
      hourNum: 2,
      subject: 'אנגלית ',
      type: 'אי הכנת ש``ב',
    });
    const id2 = generateIncidentId({
      userId: 'family',
      studentName: 'כפיר טרוסמן',
      date: '2026-11-13',
      hourNum: 2,
      subject: 'אנגלית',
      type: 'אי הבאת ציוד',
    });

    expect(id1).toMatch(/^webtop-inc-family-[0-9a-f]{32}$/);
    expect(id1).toBe(id1Whitespace);
    expect(id1).not.toBe(id2);

    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR IGNORE INTO users (id, username, password_hash, role, created_at, updated_at)
      VALUES ('family', 'family_placeholder', 'hash', 'user', ?, ?)
    `).run(now, now);

    const rawOld = JSON.stringify({ eventID: 26920001, eventType: 'אי הכנת ש``ב', subjectName: 'אנגלית' });
    const rawNew = JSON.stringify({ eventID: 26924841, eventType: 'אי הכנת ש``ב', subjectName: 'אנגלית' });

    db.prepare(
      "INSERT INTO incidents (id, user_id, student_id, student_name, date, type, subject, hour_num, event_code, raw_data, created_at) VALUES (?, 'family', 'ext-1', 'כפיר טרוסמן', '2026-11-13', 'אי הכנת ש``ב', 'אנגלית', 2, 781543, ?, ?)"
    ).run('webtop-inc-family-26920001', rawOld, now);

    db.prepare(
      "INSERT INTO incidents (id, user_id, student_id, student_name, date, type, subject, hour_num, event_code, raw_data, created_at) VALUES (?, 'family', 'ext-1', 'כפיר טרוסמן', '2026-11-13', 'אי הכנת ש``ב', 'אנגלית', 2, 781543, ?, ?)"
    ).run('webtop-inc-family-26924841', rawNew, now);

    initDb(db);

    const rows = db.prepare('SELECT id, user_id, type, subject, hour_num FROM incidents').all() as any[];
    expect(rows).toEqual([
      {
        id: id1,
        user_id: 'family',
        type: 'אי הכנת ש``ב',
        subject: 'אנגלית',
        hour_num: 2,
      },
    ]);
  });

  describe('Child Identity & Color Preservation across Ephemeral ID Rotations', () => {
    it('matches by exact ID if tokens have not rotated', () => {
      const prevChildren = [
        { id: 'token-abc', firstName: 'כפיר', lastName: 'טרוסמן', classCode: 4, color: 'blue' },
        { id: 'token-def', firstName: 'רונן', lastName: 'טרוסמן', classCode: 6, color: 'emerald' },
      ];

      const freshChild = { id: 'token-abc', firstName: 'כפיר', lastName: 'טרוסמן', classCode: 4, classNum: 2 };
      const matched = matchChildWithPrevious(freshChild, prevChildren);

      expect(matched).toBeDefined();
      expect(matched?.id).toBe('token-abc');
      expect(matched?.color).toBe('blue');
    });

    it('matches by full name when Webtop generates new encrypted ephemeral tokens on next day sync', () => {
      const prevChildren = [
        { id: 'yesterday-token-kfir-9988', firstName: 'כפיר', lastName: 'טרוסמן', classCode: 4, color: 'purple' },
        { id: 'yesterday-token-ronen-1122', firstName: 'רונן', lastName: 'טרוסמן', classCode: 6, color: 'amber' },
      ];

      const todayKfir = { id: 'today-new-token-kfir-3344', firstName: 'כפיר', lastName: 'טרוסמן', classCode: 4, classNum: 2 };
      const todayRonen = { id: 'today-new-token-ronen-5566', firstName: 'רונן', lastName: 'טרוסמן', classCode: 6, classNum: 2 };

      const matchedKfir = matchChildWithPrevious(todayKfir, prevChildren);
      const matchedRonen = matchChildWithPrevious(todayRonen, prevChildren);

      expect(matchedKfir).toBeDefined();
      expect(matchedKfir?.color).toBe('purple');

      expect(matchedRonen).toBeDefined();
      expect(matchedRonen?.color).toBe('amber');
    });

    it('tolerates whitespace differences and case during matching', () => {
      const prevChildren = [
        { id: 'old-1', firstName: '  Ron  ', lastName: '  Cohen ', classCode: 3, color: 'rose' },
      ];

      const freshChild = { id: 'new-token-77', firstName: 'Ron', lastName: 'Cohen', classCode: 3, classNum: 1 };
      const matched = matchChildWithPrevious(freshChild, prevChildren);

      expect(matched).toBeDefined();
      expect(matched?.color).toBe('rose');
    });

    it('falls back to firstName + classCode when lastName is omitted or empty', () => {
      const prevChildren = [
        { id: 'old-1', firstName: 'כפיר', lastName: 'טרוסמן', classCode: 4, color: 'cyan' },
      ];

      const freshChild = { id: 'new-token-88', firstName: 'כפיר', lastName: '', classCode: 4, classNum: 2 };
      const matched = matchChildWithPrevious(freshChild, prevChildren);

      expect(matched).toBeDefined();
      expect(matched?.color).toBe('cyan');
    });

    it('safely handles null/empty/invalid parameters without throwing', () => {
      expect(matchChildWithPrevious(null as any, [])).toBeNull();
      expect(matchChildWithPrevious({ id: 'x' } as any, null as any)).toBeNull();
      expect(matchChildWithPrevious({ id: 'x' } as any, [])).toBeNull();
    });

    it('preserves child colors and selected child across simulated daily sync in database', () => {
      const now = new Date().toISOString();
      const kfirId = generateChildId('כפיר', 'טרוסמן');
      const ronenId = generateChildId('רונן', 'טרוסמן');

      const insertChild = db.prepare(`
        INSERT INTO children (id, user_id, first_name, last_name, class_code, class_num, color, external_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertChild.run(kfirId, 'user-1', 'כפיר', 'טרוסמן', 4, 2, 'blue', 'day1-token-kfir', now, now);
      insertChild.run(ronenId, 'user-1', 'רונן', 'טרוסמן', 6, 2, 'emerald', 'day1-token-ronen', now, now);

      db.prepare(`
        INSERT INTO webtop_credentials (id, user_id, username, encrypted_password, selected_child_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('cred-1', 'user-1', 'test_user', 'enc', ronenId, now, now);

      const rawChildrenDay2 = [
        { id: 'day2-token-kfir-new', firstName: 'כפיר', lastName: 'טרוסמן', classCode: 4, classNum: 2, cellphone: '0540000000' },
        { id: 'day2-token-ronen-new', firstName: 'רונן', lastName: 'טרוסמן', classCode: 6, classNum: 2, cellphone: null },
      ];

      const upsertChild = db.prepare(`
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

      for (const c of rawChildrenDay2) {
        const childId = generateChildId(c.firstName, c.lastName);
        upsertChild.run(childId, 'user-1', c.firstName, c.lastName, c.classCode, c.classNum, c.cellphone, null, c.id, now, now);
      }

      const savedChildren = db.prepare('SELECT id, first_name, last_name, color, external_id FROM children WHERE user_id = ? ORDER BY first_name ASC').all('user-1') as any[];
      expect(savedChildren).toHaveLength(2);
      expect(savedChildren[0].id).toBe(kfirId);
      expect(savedChildren[0].color).toBe('blue');
      expect(savedChildren[0].external_id).toBe('day2-token-kfir-new');
      expect(savedChildren[1].id).toBe(ronenId);
      expect(savedChildren[1].color).toBe('emerald');
      expect(savedChildren[1].external_id).toBe('day2-token-ronen-new');

      const creds = db.prepare('SELECT selected_child_id FROM webtop_credentials WHERE user_id = ?').get('user-1') as any;
      expect(creds.selected_child_id).toBe(ronenId);
    });

    it('migrates existing colors from legacy linked_children, drops child_settings and drops linked_children column via initDb()', () => {
      const now = new Date().toISOString();
      const legacyChildren = [
        { id: 'c1', firstName: 'נועה', lastName: 'לוי', color: 'purple' },
        { id: 'c2', firstName: 'אורי', lastName: 'לוי', color: 'rose' },
      ];

      db.exec('ALTER TABLE webtop_credentials ADD COLUMN linked_children TEXT;');
      db.prepare(`
        INSERT INTO webtop_credentials (id, user_id, username, encrypted_password, linked_children, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('cred-2', 'user-1', 'parent_user', 'enc', JSON.stringify(legacyChildren), now, now);

      initDb(db);

      const children = db.prepare('SELECT first_name, last_name, color FROM children WHERE user_id = ? ORDER BY first_name ASC').all('user-1') as any[];
      expect(children).toHaveLength(2);
      expect(children).toEqual([
        { first_name: 'אורי', last_name: 'לוי', color: 'rose' },
        { first_name: 'נועה', last_name: 'לוי', color: 'purple' },
      ]);

      const childSettingsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='child_settings'").get();
      expect(childSettingsTable).toBeUndefined();

      const cols = db.prepare('PRAGMA table_info(webtop_credentials)').all().map((c: any) => c.name);
      expect(cols).not.toContain('linked_children');
    });

    it('allows children table records and colors to persist even if webtop credentials are deleted', () => {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO children (id, user_id, first_name, last_name, color, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('child_custom', 'user-1', 'רונן', 'טרוסמן', 'amber', now, now);

      db.prepare('DELETE FROM webtop_credentials WHERE user_id = ?').run('user-1');

      const child = db.prepare('SELECT color FROM children WHERE user_id = ? AND id = ?').get('user-1', 'child_custom') as any;
      expect(child).toBeDefined();
      expect(child.color).toBe('amber');
    });

    it('generates a deterministic hash child ID from first and last name with unicode and delimiter hardening', () => {
      const id1 = generateChildId('כפיר', 'טרוסמן');
      const id2 = generateChildId('  כפיר  ', 'טרוסמן ');
      const id3 = generateChildId('רונן', 'טרוסמן');
      const idRtl = generateChildId('\u200Fכפיר\u200E', 'טרוסמן');
      const idNiqqud = generateChildId('כְּפִיר', 'טרוסמן');

      expect(id1).toMatch(/^child_[0-9a-f]{32}$/);
      expect(id1).toBe(id2);
      expect(id1).toBe(idRtl);
      expect(id1).toBe(idNiqqud);
      expect(id1).not.toBe(id3);

      expect(generateChildId('a:b', 'c')).not.toBe(generateChildId('a', 'b:c'));
    });

    it('supports multi-tenant child isolation without primary key collision when two users have children with the same name', () => {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO users (id, username, password_hash, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('user-2', 'parent2', 'hash', 'user', now, now);

      const kfirId = generateChildId('כפיר', 'טרוסמן');

      const upsertChild = db.prepare(`
        INSERT INTO children (id, user_id, first_name, last_name, class_code, class_num, cellphone, color, external_id, external_source, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'webtop', ?, ?)
        ON CONFLICT(user_id, external_source, id) DO UPDATE SET
          color = coalesce(children.color, excluded.color),
          updated_at = excluded.updated_at
      `);

      expect(() => {
        upsertChild.run(kfirId, 'user-1', 'כפיר', 'טרוסמן', 4, 2, '054111', 'emerald', 'ext-1', now, now);
        upsertChild.run(kfirId, 'user-2', 'כפיר', 'טרוסמן', 4, 2, '054222', 'blue', 'ext-2', now, now);
      }).not.toThrow();

      const user1Child = db.prepare('SELECT color, external_id FROM children WHERE user_id = ? AND id = ?').get('user-1', kfirId) as any;
      const user2Child = db.prepare('SELECT color, external_id FROM children WHERE user_id = ? AND id = ?').get('user-2', kfirId) as any;

      expect(user1Child.color).toBe('emerald');
      expect(user1Child.external_id).toBe('ext-1');
      expect(user2Child.color).toBe('blue');
      expect(user2Child.external_id).toBe('ext-2');
    });

    it('backfills children table and links incidents/homework via child_id during initDb()', () => {
      const now = new Date().toISOString();
      const legacyChildren = [
        { id: 'webtop-token-1', firstName: 'כפיר', lastName: 'טרוסמן', classCode: 4, classNum: 2, color: 'blue' },
        { id: 'webtop-token-2', firstName: 'רונן', lastName: 'טרוסמן', classCode: 6, classNum: 2, color: 'emerald' },
      ];

      db.exec('ALTER TABLE webtop_credentials ADD COLUMN linked_children TEXT;');
      db.prepare(`
        INSERT INTO webtop_credentials (id, user_id, username, encrypted_password, linked_children, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('cred-mig', 'user-1', 'parent_test', 'enc', JSON.stringify(legacyChildren), now, now);

      db.prepare(`
        INSERT INTO incidents (id, user_id, student_id, student_name, date, type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('inc-mig-1', 'user-1', 'webtop-token-1', 'כפיר טרוסמן', '2026-10-29', 'Late', now);

      db.prepare(`
        INSERT INTO homework (id, user_id, student_id, student_name, subject, due_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('hw-mig-1', 'user-1', 'webtop-token-1', 'כפיר טרוסמן', 'Math', '2026-10-30', now);

      initDb(db);

      const kfirId = generateChildId('כפיר', 'טרוסמן');
      const ronenId = generateChildId('רונן', 'טרוסמן');

      const kfir = db.prepare('SELECT * FROM children WHERE id = ?').get(kfirId) as any;
      expect(kfir).toBeDefined();
      expect(kfir.first_name).toBe('כפיר');
      expect(kfir.last_name).toBe('טרוסמן');
      expect(kfir.class_code).toBe(4);
      expect(kfir.class_num).toBe(2);
      expect(kfir.color).toBe('blue');
      expect(kfir.external_id).toBe('webtop-token-1');

      const ronen = db.prepare('SELECT * FROM children WHERE id = ?').get(ronenId) as any;
      expect(ronen).toBeDefined();
      expect(ronen.color).toBe('emerald');

      const inc = db.prepare('SELECT child_id FROM incidents WHERE id = ?').get('inc-mig-1') as any;
      expect(inc.child_id).toBe(kfirId);

      const hw = db.prepare('SELECT child_id FROM homework WHERE user_id = ? AND student_name = ?').get('user-1', 'כפיר טרוסמן') as any;
      expect(hw).toBeDefined();
      expect(hw.child_id).toBe(kfirId);

      const upsertChild = db.prepare(`
        INSERT INTO children (id, user_id, first_name, last_name, class_code, class_num, cellphone, external_id, external_source, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'webtop', ?, ?)
        ON CONFLICT(user_id, external_source, id) DO UPDATE SET
          class_code = excluded.class_code,
          class_num = excluded.class_num,
          cellphone = excluded.cellphone,
          external_id = excluded.external_id,
          updated_at = excluded.updated_at
      `);

      upsertChild.run(kfirId, 'user-1', 'כפיר', 'טרוסמן', 4, 2, '0547236269', 'webtop-token-morning-rotated', now, now);

      const updatedKfir = db.prepare('SELECT * FROM children WHERE id = ?').get(kfirId) as any;
      expect(updatedKfir.id).toBe(kfirId);
      expect(updatedKfir.color).toBe('blue');
      expect(updatedKfir.external_id).toBe('webtop-token-morning-rotated');
    });

    it('deduplicates legacy children records and merges colors and references via initDb()', () => {
      const localDb = new Database(':memory:');
      initDb(localDb);

      const now = new Date().toISOString();
      const canonicalKfirId = generateChildId('כפיר', 'טרוסמן');
      const legacyKfirId = 'child_legacy_kfir_hash';

      localDb.prepare("INSERT INTO users (id, username, password_hash, role, created_at, updated_at) VALUES ('user-dedupe', 'dedupe_user', 'hash', 'user', ?, ?)").run(now, now);
      localDb.exec('DROP INDEX IF EXISTS idx_children_name_unique;');

      localDb.prepare(`
        INSERT INTO children (id, user_id, first_name, last_name, color, external_id, created_at, updated_at)
        VALUES (?, 'user-dedupe', 'כפיר', 'טרוסמן', 'amber', 'ext-1', ?, ?)
      `).run(legacyKfirId, now, now);

      localDb.prepare(`
        INSERT INTO children (id, user_id, first_name, last_name, color, external_id, created_at, updated_at)
        VALUES (?, 'user-dedupe', 'כפיר', 'טרוסמן', NULL, 'ext-2', ?, ?)
      `).run(canonicalKfirId, now, now);

      localDb.prepare(`
        INSERT INTO webtop_credentials (id, user_id, username, encrypted_password, selected_child_id, created_at, updated_at)
        VALUES ('cred-dedupe', 'user-dedupe', 'parent_user', 'enc', ?, ?, ?)
      `).run(legacyKfirId, now, now);

      localDb.prepare(`
        INSERT INTO incidents (id, user_id, child_id, student_name, date, type, created_at)
        VALUES ('inc-dedupe', 'user-dedupe', ?, 'כפיר טרוסמן', '2026-10-30', 'חיסור', ?)
      `).run(legacyKfirId, now);

      initDb(localDb);

      const children = localDb.prepare("SELECT * FROM children WHERE user_id = 'user-dedupe'").all() as any[];
      expect(children).toHaveLength(1);
      expect(children[0].id).toBe(canonicalKfirId);
      expect(children[0].color).toBe('amber');

      const cred = localDb.prepare("SELECT selected_child_id FROM webtop_credentials WHERE user_id = 'user-dedupe'").get() as any;
      expect(cred.selected_child_id).toBe(canonicalKfirId);

      const inc = localDb.prepare("SELECT child_id FROM incidents WHERE id = 'inc-dedupe'").get() as any;
      expect(inc.child_id).toBe(canonicalKfirId);
      localDb.close();
    });
  });
});
