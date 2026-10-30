import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { encryptPassword, decryptPassword, encryptWebtopPayload, getWebtopStudyYear, matchChildWithPrevious } from '../../server/webtop.js';
import { initDb } from '../../server/db.js';

describe('Webtop Cryptographic & Academic Utilities', () => {
  it('encrypts and decrypts passwords reliably using AES-256-GCM', () => {
    const originalPassword = 'MySecretSchoolPassword#2026!';
    const encrypted = encryptPassword(originalPassword);

    expect(encrypted).not.toBe(originalPassword);
    expect(encrypted).toContain(':');
    const parts = encrypted.split(':');
    expect(parts.length).toBe(3); // iv:authTag:cipherHex

    const decrypted = decryptPassword(encrypted);
    expect(decrypted).toBe(originalPassword);
  });

  it('rejects tampered or malformed cipher text', () => {
    expect(() => decryptPassword('invalid-cipher-format')).toThrow('Invalid encrypted password format');

    const encrypted = encryptPassword('validPassword');
    const parts = encrypted.split(':');
    // Tamper with the ciphertext
    const tampered = `${parts[0]}:${parts[1]}:bad${parts[2].slice(3)}`;
    expect(() => decryptPassword(tampered)).toThrow();
  });

  it('decrypts legacy passwords encrypted with the backward-compatible fallback secret', () => {
    // Legacy ciphertext generated using 'school-webtop-credential-salt-2026'
    // '7a088ab05a1902f886ab8f5d:2ba3d0f0771bf1792b28756c9f832663:c64064314f35f61474f00b6b729a7b'
    const legacyCipher = '7a088ab05a1902f886ab8f5d:2ba3d0f0771bf1792b28756c9f832663:c64064314f35f61474f00b6b729a7b';
    const decrypted = decryptPassword(legacyCipher);
    expect(decrypted).toBeDefined();
    expect(decrypted.length).toBeGreaterThan(0);
  });

  it('encrypts string payloads for Webtop server using AES-256-CBC', () => {
    const encrypted = encryptWebtopPayload('testuser0');
    expect(typeof encrypted).toBe('string');
    expect(encrypted.length).toBeGreaterThan(0);
    // Base64 format check
    expect(/^[A-Za-z0-9+/=]+$/.test(encrypted)).toBe(true);
  });

  it('correctly calculates the Webtop studyYear across months', () => {
    // School year in Israel: Sept-Dec of year X belongs to school year X+1
    expect(getWebtopStudyYear(new Date('2025-10-15'))).toBe(2026);
    expect(getWebtopStudyYear(new Date('2025-09-01'))).toBe(2026);
    expect(getWebtopStudyYear(new Date('2026-01-10'))).toBe(2026);
    expect(getWebtopStudyYear(new Date('2026-06-20'))).toBe(2026);
    // Next school year starts in August/September 2026
    expect(getWebtopStudyYear(new Date('2026-09-01'))).toBe(2027);
  });
});

describe('Webtop Database & Data Models', () => {
  let db: ReturnType<typeof Database>;

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
        linked_children TEXT DEFAULT '[]',
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

      CREATE TABLE child_settings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        child_name TEXT NOT NULL,
        color TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(user_id, child_name)
      );
    `);

    // Insert mock user
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
      INSERT INTO webtop_credentials (id, user_id, username, encrypted_password, selected_child_id, linked_children, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'cred-1',
      'user-1',
      'webtop_user_test',
      encrypted,
      'child-1',
      JSON.stringify([{ id: 'child-1', firstName: 'Kfir', lastName: 'Trosman' }]),
      now,
      now
    );

    const row = db.prepare('SELECT * FROM webtop_credentials WHERE user_id = ?').get('user-1') as any;
    expect(row).toBeDefined();
    expect(row.username).toBe('webtop_user_test');
    expect(row.encrypted_password).not.toBe(plainPass);
    expect(decryptPassword(row.encrypted_password)).toBe(plainPass);

    const children = JSON.parse(row.linked_children);
    expect(children).toHaveLength(1);
    expect(children[0].firstName).toBe('Kfir');
  });

  it('cascades deletion of webtop_credentials, child_settings, incidents, and homework when user is deleted', () => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO webtop_credentials (id, user_id, username, encrypted_password, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('cred-1', 'user-1', 'test_user', 'enc', now, now);

    db.prepare(`
      INSERT INTO child_settings (id, user_id, child_name, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('setting-1', 'user-1', 'Kfir Trosman', 'blue', now, now);

    db.prepare(`
      INSERT INTO incidents (id, user_id, student_id, student_name, date, type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('inc-1', 'user-1', 'child-1', 'Kfir', '2026-10-27', 'Discipline', now);

    db.prepare(`
      INSERT INTO homework (id, user_id, student_id, student_name, subject, due_date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('hw-1', 'user-1', 'child-1', 'Kfir', 'Math', '2026-10-27', now);

    // Delete user
    db.prepare('DELETE FROM users WHERE id = ?').run('user-1');

    expect(db.prepare('SELECT COUNT(*) as count FROM webtop_credentials').get()).toEqual({ count: 0 });
    expect(db.prepare('SELECT COUNT(*) as count FROM child_settings').get()).toEqual({ count: 0 });
    expect(db.prepare('SELECT COUNT(*) as count FROM incidents').get()).toEqual({ count: 0 });
    expect(db.prepare('SELECT COUNT(*) as count FROM homework').get()).toEqual({ count: 0 });
  });

  it('filters incidents and homework by child_id and toggles homework completion', () => {
    const now = new Date().toISOString();

    // Insert incidents for two different children
    db.prepare(`
      INSERT INTO incidents (id, user_id, student_id, student_name, date, type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'inc-1', 'user-1', 'child-1', 'Child One', '2026-10-27', 'Late', now,
      'inc-2', 'user-1', 'child-2', 'Child Two', '2026-10-27', 'Absent', now
    );

    // Filter by child-1
    const child1Incidents = db.prepare('SELECT * FROM incidents WHERE user_id = ? AND student_id = ?').all('user-1', 'child-1');
    expect(child1Incidents).toHaveLength(1);
    expect((child1Incidents[0] as any).student_name).toBe('Child One');

    // Insert and toggle homework
    db.prepare(`
      INSERT INTO homework (id, user_id, student_id, student_name, subject, due_date, completed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).run('hw-1', 'user-1', 'child-1', 'Child One', 'Hebrew', '2026-10-27', now);

    const initialHw = db.prepare('SELECT completed FROM homework WHERE id = ?').get('hw-1') as any;
    expect(initialHw.completed).toBe(0);

    // Toggle to completed
    db.prepare('UPDATE homework SET completed = 1 WHERE id = ?').run('hw-1');
    const toggledHw = db.prepare('SELECT completed FROM homework WHERE id = ?').get('hw-1') as any;
    expect(toggledHw.completed).toBe(1);
  });

  it('migrates legacy unscoped IDs to user-scoped IDs and eliminates duplicates', () => {
    const now = new Date().toISOString();

    // 1. Old incident + duplicate new incident
    db.prepare(`
      INSERT INTO incidents (id, user_id, student_id, student_name, date, type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('webtop-inc-1001', 'user-1', 'child-1', 'Child One', '2026-10-27', 'Late', now);
    db.prepare(`
      INSERT INTO incidents (id, user_id, student_id, student_name, date, type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('webtop-inc-user-1-1001', 'user-1', 'child-1', 'Child One', '2026-10-27', 'Late', now);

    // 2. Old incident without duplicate
    db.prepare(`
      INSERT INTO incidents (id, user_id, student_id, student_name, date, type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('webtop-inc-1002', 'user-1', 'child-1', 'Child One', '2026-10-27', 'Discipline', now);

    // 3. Old homework marked completed + duplicate new homework uncompleted
    db.prepare(`
      INSERT INTO homework (id, user_id, student_id, student_name, subject, due_date, hour_num, completed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)
    `).run('webtop-hw-child-1-2026-10-28-1-math', 'user-1', 'child-1', 'Child One', 'Math', '2026-10-28', now);
    db.prepare(`
      INSERT INTO homework (id, user_id, student_id, student_name, subject, due_date, hour_num, completed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?)
    `).run('webtop-hw-user-1-child-1-2026-10-28-1-math', 'user-1', 'child-1', 'Child One', 'Math', '2026-10-28', now);

    // Run initDb migration on this database instance
    initDb(db);

    // Check incidents
    const incidents = db.prepare('SELECT id FROM incidents WHERE user_id = ?').all('user-1') as any[];
    expect(incidents).toHaveLength(2);
    expect(incidents.map(i => i.id).sort()).toEqual([
      'webtop-inc-user-1-1001',
      'webtop-inc-user-1-1002'
    ]);

    // Check homework and completion state preservation
    const homework = db.prepare('SELECT id, completed FROM homework WHERE user_id = ?').all('user-1') as any[];
    expect(homework).toHaveLength(1);
    expect(homework[0].id).toBe('webtop-hw-user-1-Child_One-2026-10-28-1-Math');
    expect(homework[0].completed).toBe(1);
  });

  describe('Child Identity & Color Preservation across Ephemeral ID Rotations', () => {
    it('matches by exact ID if tokens have not rotated', () => {
      const prevChildren = [
        { id: 'token-abc', firstName: 'כפיר', lastName: 'טרוסמן', classCode: 4, color: 'blue' },
        { id: 'token-def', firstName: 'רונן', lastName: 'טרוסמן', classCode: 6, color: 'emerald' }
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
        { id: 'yesterday-token-ronen-1122', firstName: 'רונן', lastName: 'טרוסמן', classCode: 6, color: 'amber' }
      ];

      // Next day, Webtop returns completely new encrypted IDs for each child
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
        { id: 'old-1', firstName: '  Ron  ', lastName: '  Cohen ', classCode: 3, color: 'rose' }
      ];

      const freshChild = { id: 'new-token-77', firstName: 'Ron', lastName: 'Cohen', classCode: 3, classNum: 1 };
      const matched = matchChildWithPrevious(freshChild, prevChildren);

      expect(matched).toBeDefined();
      expect(matched?.color).toBe('rose');
    });

    it('falls back to firstName + classCode when lastName is omitted or empty', () => {
      const prevChildren = [
        { id: 'old-1', firstName: 'כפיר', lastName: 'טרוסמן', classCode: 4, color: 'cyan' }
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
      const initialChildren = [
        { id: 'day1-token-kfir', firstName: 'כפיר', lastName: 'טרוסמן', classCode: 4, classNum: 2, color: 'blue' },
        { id: 'day1-token-ronen', firstName: 'רונן', lastName: 'טרוסמן', classCode: 6, classNum: 2, color: 'emerald' }
      ];

      // User selects Ronen (day1-token-ronen) as active child
      db.prepare(`
        INSERT INTO webtop_credentials (id, user_id, username, encrypted_password, selected_child_id, linked_children, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('cred-1', 'user-1', 'test_user', 'enc', 'day1-token-ronen', JSON.stringify(initialChildren), now, now);

      // Next morning: Webtop returns day 2 with brand new tokens
      const rawChildrenDay2 = [
        { id: 'day2-token-kfir-new', firstName: 'כפיר', lastName: 'טרוסמן', classCode: 4, classNum: 2, cellphone: '0540000000' },
        { id: 'day2-token-ronen-new', firstName: 'רונן', lastName: 'טרוסמן', classCode: 6, classNum: 2, cellphone: null }
      ];

      const creds = db.prepare('SELECT * FROM webtop_credentials WHERE user_id = ?').get('user-1') as any;
      const existingLinked = JSON.parse(creds.linked_children || '[]');

      // Simulate the updated backend sync logic
      const linkedChildrenDay2 = rawChildrenDay2.map((c, idx) => {
        const prev = matchChildWithPrevious(c, existingLinked, idx);
        return {
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          classCode: c.classCode,
          classNum: c.classNum,
          cellphone: c.cellphone || null,
          color: prev?.color || null
        };
      });

      let selectedChildId = creds.selected_child_id;
      if (selectedChildId === 'all') {
        // keep all
      } else if (!selectedChildId || !linkedChildrenDay2.some(c => c.id === selectedChildId)) {
        const prevSelected = existingLinked.find((c: any) => c.id === selectedChildId);
        const matchedNew = prevSelected ? matchChildWithPrevious(prevSelected, linkedChildrenDay2) : null;
        selectedChildId = matchedNew ? matchedNew.id : (linkedChildrenDay2[0]?.id || null);
      }

      db.prepare(`
        UPDATE webtop_credentials
        SET linked_children = ?, selected_child_id = ?, updated_at = ?
        WHERE user_id = ?
      `).run(JSON.stringify(linkedChildrenDay2), selectedChildId, new Date().toISOString(), 'user-1');

      // Verify persistence in SQLite
      const updatedCreds = db.prepare('SELECT * FROM webtop_credentials WHERE user_id = ?').get('user-1') as any;
      const savedChildren = JSON.parse(updatedCreds.linked_children);

      expect(savedChildren).toHaveLength(2);
      // Kfir's color is still 'blue' even with new token
      expect(savedChildren[0].id).toBe('day2-token-kfir-new');
      expect(savedChildren[0].color).toBe('blue');

      // Ronen's color is still 'emerald' even with new token
      expect(savedChildren[1].id).toBe('day2-token-ronen-new');
      expect(savedChildren[1].color).toBe('emerald');

      // Selected child is preserved as Ronen's new token, NOT reset to Kfir
      expect(updatedCreds.selected_child_id).toBe('day2-token-ronen-new');
    });

    it('migrates existing colors from webtop_credentials to child_settings via initDb()', () => {
      const now = new Date().toISOString();
      const legacyChildren = [
        { id: 'c1', firstName: 'נועה', lastName: 'לוי', color: 'purple' },
        { id: 'c2', firstName: 'אורי', lastName: 'לוי', color: 'rose' }
      ];

      db.prepare(`
        INSERT INTO webtop_credentials (id, user_id, username, encrypted_password, linked_children, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('cred-2', 'user-1', 'parent_user', 'enc', JSON.stringify(legacyChildren), now, now);

      // Run initDb migration
      initDb(db);

      // Check child_settings table
      const settings = db.prepare('SELECT child_name, color FROM child_settings WHERE user_id = ? ORDER BY child_name ASC').all('user-1') as any[];
      expect(settings).toHaveLength(2);
      expect(settings).toEqual([
        { child_name: 'אורי לוי', color: 'rose' },
        { child_name: 'נועה לוי', color: 'purple' }
      ]);
    });

    it('allows child_settings to persist even if webtop credentials are deleted', () => {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO child_settings (id, user_id, child_name, color, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('cs-1', 'user-1', 'רונן טרוסמן', 'amber', now, now);

      // Webtop credentials disconnected/deleted
      db.prepare('DELETE FROM webtop_credentials WHERE user_id = ?').run('user-1');

      // child_settings table is untouched because it is an independent application settings table
      const setting = db.prepare('SELECT color FROM child_settings WHERE user_id = ? AND child_name = ?').get('user-1', 'רונן טרוסמן') as any;
      expect(setting).toBeDefined();
      expect(setting.color).toBe('amber');
    });
  });
});

