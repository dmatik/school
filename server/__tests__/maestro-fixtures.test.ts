import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomBytes } from 'crypto';
import { afterEach, describe, expect, it } from '@jest/globals';
import Database from 'better-sqlite3';
import { createEphemeralDb, removeEphemeralDb } from '../../mobile/scripts/maestro-fixtures.mjs';
import { WebtopClient } from '../webtop.js';

describe('Maestro E2E fixtures and isolation', () => {
  const tempDbPaths: string[] = [];

  afterEach(() => {
    delete process.env.WEBTOP_DISABLE_EXTERNAL;
    while (tempDbPaths.length > 0) {
      const p = tempDbPaths.pop();
      if (p) removeEphemeralDb(p);
    }
  });

  it('seeds synthetic users, children, homework, incidents, exams, and schedule in an ephemeral DB and cleans up completely', async () => {
    const dbPath = path.join(
      os.tmpdir(),
      `school-maestro-unit-${Date.now()}-${randomBytes(3).toString('hex')}.db`
    );
    tempDbPaths.push(dbPath);

    const fixtures = await createEphemeralDb(dbPath);

    expect(fs.existsSync(dbPath)).toBe(true);
    expect(fixtures.admin.username).toMatch(/^e2e_admin_/);
    expect(fixtures.parent.username).toMatch(/^e2e_parent_/);
    expect(fixtures.child.username).toMatch(/^e2e_child_/);
    expect(fixtures.children).toHaveLength(2);

    const verifyDb = new Database(dbPath, { readonly: true });
    try {
      const usersCount = verifyDb.prepare("SELECT COUNT(*) as c FROM users WHERE id LIKE 'e2e_%'").get() as { c: number };
      const childrenCount = verifyDb.prepare('SELECT COUNT(*) as c FROM children').get() as { c: number };
      const hwCount = verifyDb.prepare('SELECT COUNT(*) as c FROM homework').get() as { c: number };
      const incCount = verifyDb.prepare('SELECT COUNT(*) as c FROM incidents').get() as { c: number };
      const examsCount = verifyDb.prepare('SELECT COUNT(*) as c FROM exams').get() as { c: number };
      const lessonsCount = verifyDb.prepare('SELECT COUNT(*) as c FROM schedule_lessons').get() as { c: number };
      const finishCount = verifyDb.prepare('SELECT COUNT(*) as c FROM schedule_day_settings').get() as { c: number };

      expect(usersCount.c).toBe(3);
      expect(childrenCount.c).toBe(2);
      expect(hwCount.c).toBe(2);
      expect(incCount.c).toBe(2);
      expect(examsCount.c).toBe(3);
      expect(lessonsCount.c).toBe(18);
      expect(finishCount.c).toBe(12);
    } finally {
      verifyDb.close();
    }

    removeEphemeralDb(dbPath);
    expect(fs.existsSync(dbPath)).toBe(false);
    expect(fs.existsSync(`${dbPath}-wal`)).toBe(false);
    expect(fs.existsSync(`${dbPath}-shm`)).toBe(false);
  });

  it('hard-blocks external Webtop requests when WEBTOP_DISABLE_EXTERNAL=true', async () => {
    process.env.WEBTOP_DISABLE_EXTERNAL = 'true';
    const client = new WebtopClient();
    await expect(client.login('test-user', 'test-pass')).rejects.toThrow(
      /External Webtop calls are disabled in test mode/
    );
  });
});
