import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { encryptPassword, decryptPassword, encryptWebtopPayload, getWebtopStudyYear } from '../../server/webtop.js';
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

  it('cascades deletion of webtop_credentials, incidents, and homework when user is deleted', () => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO webtop_credentials (id, user_id, username, encrypted_password, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('cred-1', 'user-1', 'test_user', 'enc', now, now);

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
      INSERT INTO homework (id, user_id, student_id, student_name, subject, due_date, completed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `).run('webtop-hw-child-1-2026-10-28-1-math', 'user-1', 'child-1', 'Child One', 'Math', '2026-10-28', now);
    db.prepare(`
      INSERT INTO homework (id, user_id, student_id, student_name, subject, due_date, completed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
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
    expect(homework[0].id).toBe('webtop-hw-user-1-child-1-2026-10-28-1-math');
    expect(homework[0].completed).toBe(1);
  });
});

