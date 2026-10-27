import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import db, { initDb } from '../../server/db.js'
import bcrypt from 'bcryptjs'

describe('SQLite Database & Auth System', () => {
  beforeAll(() => {
    initDb()
    db.prepare("DELETE FROM users WHERE id IN ('u1', 'test-user-1', 'test-user-2', 'temp-user', 'temp-passkey-user')").run()
    db.prepare("UPDATE users SET username = 'admin', password_hash = ? WHERE id = 'admin-default'")
      .run(bcrypt.hashSync('admin', 10))
  })

  afterAll(() => {
    try {
      db.prepare("DELETE FROM users WHERE id IN ('u1', 'test-user-1', 'test-user-2', 'temp-user', 'temp-passkey-user')").run()
      if (db.open) {
        db.close()
      }
    } catch {
      // ignore
    }
  })

  it('initializes database with default admin user (admin / admin)', () => {
    const adminUser = db.prepare('SELECT * FROM users WHERE role = ?').get('admin') as any
    expect(adminUser).toBeDefined()
    expect(adminUser.username).toBe('admin')
    expect(adminUser.role).toBe('admin')
    expect(bcrypt.compareSync('admin', adminUser.password_hash)).toBe(true)
  })

  it('allows updating admin credentials in database', () => {
    const newHash = bcrypt.hashSync('newSecretPassword123', 10)
    db.prepare("UPDATE users SET username = 'admin_updated', password_hash = ? WHERE id = 'admin-default'")
      .run(newHash)

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get('admin-default') as any
    expect(updatedUser.username).toBe('admin_updated')
    expect(bcrypt.compareSync('newSecretPassword123', updatedUser.password_hash)).toBe(true)

    // Restore to admin / admin
    db.prepare("UPDATE users SET username = 'admin', password_hash = ? WHERE id = 'admin-default'")
      .run(bcrypt.hashSync('admin', 10))
  })

  it('enforces unique usernames (case-insensitive)', () => {
    expect(() => {
      db.prepare(`
        INSERT INTO users (id, username, password_hash, role, created_at, updated_at)
        VALUES ('u1', 'ADMIN', 'hash', 'user', 'now', 'now')
      `).run()
    }).toThrow()
  })

  it('scopes incidents and homework per user', () => {
    const user1Id = 'test-user-1'
    const user2Id = 'test-user-2'
    const now = new Date().toISOString()

    // Create user 1 and user 2
    db.prepare(`
      INSERT OR REPLACE INTO users (id, username, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user1Id, 'user1', 'hash', 'user', now, now)

    db.prepare(`
      INSERT OR REPLACE INTO users (id, username, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user2Id, 'user2', 'hash', 'user', now, now)

    // Insert incident for user 1
    db.prepare(`
      INSERT OR REPLACE INTO incidents (id, user_id, student_name, date, type, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('inc1', user1Id, 'Student 1', '2026-03-01', 'Late', 'Late arrival', now)

    // Insert incident for user 2
    db.prepare(`
      INSERT OR REPLACE INTO incidents (id, user_id, student_name, date, type, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('inc2', user2Id, 'Student 2', '2026-03-01', 'Absence', 'Sick', now)

    // Verify user 1 only sees user 1 incidents
    const user1Incidents = db.prepare('SELECT * FROM incidents WHERE user_id = ?').all(user1Id) as any[]
    expect(user1Incidents).toHaveLength(1)
    expect(user1Incidents[0].type).toBe('Late')

    // Verify user 2 only sees user 2 incidents
    const user2Incidents = db.prepare('SELECT * FROM incidents WHERE user_id = ?').all(user2Id) as any[]
    expect(user2Incidents).toHaveLength(1)
    expect(user2Incidents[0].type).toBe('Absence')
  })

  it('cascades deletion of incidents and homework when user is deleted', () => {
    const tempUserId = 'temp-user'
    const now = new Date().toISOString()

    db.prepare(`
      INSERT OR REPLACE INTO users (id, username, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(tempUserId, 'tempuser', 'hash', 'user', now, now)

    db.prepare(`
      INSERT OR REPLACE INTO incidents (id, user_id, student_name, date, type, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('temp-inc', tempUserId, 'Temp Student', '2026-03-01', 'Discipline', 'Behavior', now)

    db.prepare(`
      INSERT OR REPLACE INTO homework (id, user_id, student_name, subject, due_date, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('temp-hw', tempUserId, 'Temp Student', 'Math', '2026-03-05', 'Exercises', now)

    // Delete user
    db.prepare('DELETE FROM users WHERE id = ?').run(tempUserId)

    // Verify incidents and homework are deleted
    const incidents = db.prepare('SELECT * FROM incidents WHERE user_id = ?').all(tempUserId)
    const homework = db.prepare('SELECT * FROM homework WHERE user_id = ?').all(tempUserId)
    expect(incidents).toHaveLength(0)
    expect(homework).toHaveLength(0)
  })

  it('stores, retrieves, and cascades WebAuthn passkey authenticators', () => {
    const tempUserId = 'temp-passkey-user'
    const now = new Date().toISOString()
    const rawPubKey = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8])

    // Create user
    db.prepare(`
      INSERT OR REPLACE INTO users (id, username, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(tempUserId, 'passkeyuser', 'hash', 'user', now, now)

    // Insert passkey
    db.prepare(`
      INSERT INTO authenticators (
        id, user_id, public_key, counter, device_type, backed_up, transports, device_name, created_at, last_used_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'cred-id-123',
      tempUserId,
      rawPubKey,
      0,
      'singleDevice',
      1,
      JSON.stringify(['internal']),
      'MacBook Pro Touch ID',
      now,
      now
    )

    // Retrieve and verify
    const authRecord = db.prepare('SELECT * FROM authenticators WHERE id = ?').get('cred-id-123') as any
    expect(authRecord).toBeDefined()
    expect(authRecord.user_id).toBe(tempUserId)
    expect(authRecord.device_name).toBe('MacBook Pro Touch ID')
    expect(Buffer.compare(authRecord.public_key, rawPubKey)).toBe(0)
    expect(JSON.parse(authRecord.transports)).toEqual(['internal'])

    // Update counter and last_used
    const later = new Date(Date.now() + 1000).toISOString()
    db.prepare('UPDATE authenticators SET counter = ?, last_used_at = ? WHERE id = ?').run(1, later, 'cred-id-123')
    const updatedRecord = db.prepare('SELECT * FROM authenticators WHERE id = ?').get('cred-id-123') as any
    expect(updatedRecord.counter).toBe(1)
    expect(updatedRecord.last_used_at).toBe(later)

    // Verify cascade deletion
    db.prepare('DELETE FROM users WHERE id = ?').run(tempUserId)
    const afterDelete = db.prepare('SELECT * FROM authenticators WHERE user_id = ?').all(tempUserId)
    expect(afterDelete).toHaveLength(0)
  })

  it('correctly queries admin count without SQLite syntax error and identifies sole admin', () => {
    const adminCount = (db.prepare('SELECT COUNT(*) as c FROM users WHERE role = ?').get('admin') as any).c
    expect(adminCount).toBeGreaterThanOrEqual(1)

    const defaultAdmin = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get('admin-default') as any
    expect(defaultAdmin).toBeDefined()
    expect(defaultAdmin.username).toBe('admin')
    expect(defaultAdmin.role).toBe('admin')
  })
})
