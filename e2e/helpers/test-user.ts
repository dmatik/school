import db, { initDb } from '../../server/db.js';
import bcrypt from 'bcryptjs';
import { Page, expect } from '@playwright/test';
import { randomBytes } from 'crypto';

export interface TestUser {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'user';
  familyRole?: 'parent' | 'child';
  linkedChildId?: string | null;
}

/**
 * Creates a unique dedicated test user directly in the database.
 * When creating a child user without an explicit linkedChildId, links to the
 * first seeded child in `webtop_children` if available so schedule/exam views load cleanly.
 */
export function createTestUser(
  role: 'admin' | 'user' = 'admin',
  familyRole: 'parent' | 'child' = 'parent',
  linkedChildId: string | null = null
): TestUser {
  initDb(db);
  const uniqueId = `e2e_${Date.now()}_${randomBytes(3).toString('hex')}`;
  const username = `e2e_user_${Date.now()}_${randomBytes(2).toString('hex')}`;
  const password = `Pass_${Date.now()}!`;
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const now = new Date().toISOString();
  const effectiveFamilyRole = role === 'admin' ? 'parent' : familyRole;

  let resolvedChildId = linkedChildId;
  if (effectiveFamilyRole === 'child' && !resolvedChildId) {
    try {
      const firstChild = db.prepare('SELECT id FROM children LIMIT 1').get() as
        | { id: string }
        | undefined;
      resolvedChildId = firstChild?.id ?? null;
    } catch {
      resolvedChildId = null;
    }
  }

  db.prepare(`
    INSERT INTO users (id, username, password_hash, first_name, last_name, avatar, role, family_role, linked_child_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    uniqueId,
    username,
    passwordHash,
    'E2E',
    'TestUser',
    '',
    role,
    effectiveFamilyRole,
    effectiveFamilyRole === 'child' ? resolvedChildId : null,
    now,
    now
  );

  return {
    id: uniqueId,
    username,
    password,
    role,
    familyRole: effectiveFamilyRole,
    linkedChildId: resolvedChildId,
  };
}

/**
 * Deletes a dedicated test user and all associated records from the database.
 */
export function deleteTestUser(userId: string) {
  try {
    db.prepare('DELETE FROM authenticators WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM incidents WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM homework WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  } catch (err) {
    console.error(`Failed to delete test user ${userId}:`, err);
  }
}

/**
 * Sweeps any lingering E2E test users (prefixed with e2e_).
 */
export function cleanupAllTestUsers() {
  try {
    db.prepare("DELETE FROM authenticators WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'e2e_%' OR id LIKE 'e2e_%')").run();
    db.prepare("DELETE FROM incidents WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'e2e_%' OR id LIKE 'e2e_%')").run();
    db.prepare("DELETE FROM homework WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'e2e_%' OR id LIKE 'e2e_%')").run();
    db.prepare("DELETE FROM users WHERE username LIKE 'e2e_%' OR id LIKE 'e2e_%'").run();
  } catch (err) {
    console.error('Failed to cleanup all test users:', err);
  }
}

/**
 * Logs in with a specific test user in Playwright against the Expo Web UI.
 */
export async function loginWithUser(page: Page, user: TestUser) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByTestId('username-input').fill(user.username);
  await page.getByTestId('password-input').fill(user.password);
  await page.getByTestId('login-submit-button').click();

  // Wait until logged in (desktop sidebar or mobile header account button visible)
  await expect(
    page.getByTestId('desktop-sidebar').or(page.getByTestId('header-account-button')).first()
  ).toBeVisible();
}
