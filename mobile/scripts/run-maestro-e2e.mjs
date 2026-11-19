import { execSync } from 'child_process';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import db, { initDb } from '../../server/db.js';

const SERVER_URL = process.env.MAESTRO_SERVER_URL || 'http://localhost:3001';

function createTempUser(role = 'admin', familyRole = 'parent') {
  initDb(db);
  const id = `e2e_${Date.now()}_${randomBytes(3).toString('hex')}`;
  const username = `e2e_user_${Date.now()}_${randomBytes(2).toString('hex')}`;
  const password = `Pass_${Date.now()}!`;
  const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
  const now = new Date().toISOString();
  const effectiveFamilyRole = role === 'admin' ? 'parent' : familyRole;

  db.prepare(`
    INSERT INTO users (id, username, password_hash, first_name, last_name, avatar, role, family_role, linked_child_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, username, passwordHash, 'E2E', 'MobileUser', '', role, effectiveFamilyRole, null, now, now);

  return { id, username, password };
}

function cleanupTestUsers() {
  try {
    db.prepare("DELETE FROM authenticators WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'e2e_%' OR id LIKE 'e2e_%')").run();
    db.prepare("DELETE FROM incidents WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'e2e_%' OR id LIKE 'e2e_%')").run();
    db.prepare("DELETE FROM homework WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'e2e_%' OR id LIKE 'e2e_%')").run();
    db.prepare("DELETE FROM users WHERE username LIKE 'e2e_%' OR id LIKE 'e2e_%'").run();
  } catch (err) {
    console.error('Failed to cleanup Maestro test users:', err);
  }
}

cleanupTestUsers();
const admin = createTempUser('admin', 'parent');
const parent = createTempUser('user', 'parent');
const child = createTempUser('user', 'child');

try {
  execSync(
    `maestro test mobile/.maestro ` +
      `-e SERVER_URL=${SERVER_URL} ` +
      `-e ADMIN_USERNAME=${admin.username} ` +
      `-e ADMIN_PASSWORD=${admin.password} ` +
      `-e PARENT_USERNAME=${parent.username} ` +
      `-e PARENT_PASSWORD=${parent.password} ` +
      `-e CHILD_USERNAME=${child.username} ` +
      `-e CHILD_PASSWORD=${child.password}`,
    { stdio: 'inherit' }
  );
} finally {
  cleanupTestUsers();
}
