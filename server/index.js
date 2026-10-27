import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import db, { initDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

// In-memory rate limiting map: ip -> { count, resetAt }
const authRateLimits = new Map();
function rateLimitAuth(maxAttempts = (process.env.NODE_ENV === 'test' ? 1000 : 60), windowMs = 60 * 1000) {
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const record = authRateLimits.get(ip) || { count: 0, resetAt: now + windowMs };

    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }

    record.count++;
    authRateLimits.set(ip, record);

    if (record.count > maxAttempts) {
      return res.status(429).json({
        error: 'too_many_requests',
        message: 'Too many authentication attempts. Please try again in a minute.'
      });
    }

    next();
  };
}

// Periodic cleanup of rate limits every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of authRateLimits.entries()) {
    if (rec.resetAt < now) {
      authRateLimits.delete(ip);
    }
  }
}, 10 * 60 * 1000).unref();

// In-memory WebAuthn challenges: challengeId -> { challenge, userId, username, expiresAt }
const webauthnChallenges = new Map();

// Periodic cleanup of expired challenges every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, val] of webauthnChallenges.entries()) {
    if (val.expiresAt < now) {
      webauthnChallenges.delete(id);
    }
  }
}, 5 * 60 * 1000).unref();

function getWebAuthnConfig(req) {
  const rawOrigin = req.headers.origin || req.headers.referer;
  let clientOrigin = null;
  let clientHostname = null;

  if (rawOrigin) {
    try {
      const parsed = new URL(rawOrigin);
      clientOrigin = `${parsed.protocol}//${parsed.host}`;
      clientHostname = parsed.hostname;
    } catch {
      // ignore
    }
  }

  const hostHeader = req.get('host') || 'localhost:3001';
  const serverHostname = hostHeader.split(':')[0];
  const serverOrigin = `${req.protocol}://${hostHeader}`;

  const rpID = process.env.RP_ID || clientHostname || serverHostname || 'localhost';

  const origins = new Set();
  if (process.env.EXPECTED_ORIGIN) {
    process.env.EXPECTED_ORIGIN.split(',').forEach(o => origins.add(o.trim()));
  }
  if (clientOrigin) origins.add(clientOrigin);
  if (serverOrigin) origins.add(serverOrigin);

  // Permitted local development and container origins
  origins.add('http://localhost:5173');
  origins.add('http://localhost:3001');
  origins.add('http://localhost:8080');
  origins.add('http://127.0.0.1:5173');
  origins.add('http://127.0.0.1:3001');
  origins.add('http://127.0.0.1:8080');

  const expectedOrigin = Array.from(origins);
  return { rpID, expectedOrigin, rpName: 'School' };
}

// Initialize SQLite database
initDb();

function getOrCreateJwtSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('jwt_secret');
  if (row?.value) {
    return row.value;
  }

  const generated = crypto.randomBytes(64).toString('hex');
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('jwt_secret', generated);
  return generated;
}

const JWT_SECRET = getOrCreateJwtSecret();

function safeJsonParse(value, fallback = []) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Cache-Control headers for all API requests
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));

/* --- Auth Middleware --- */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, username, role, first_name, last_name, avatar, token_version FROM users WHERE id = ?').get(payload.id);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    const currentTokenVersion = user.token_version || 0;
    const payloadTokenVersion = payload.tokenVersion ?? 0;
    if (payloadTokenVersion !== currentTokenVersion) {
      return res.status(401).json({ error: 'Session invalidated due to password change. Please log in again.' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      avatar: user.avatar || ''
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
}

/* --- Auth Routes --- */

// POST /api/auth/login
app.post('/api/auth/login', rateLimitAuth(20, 60000), (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username.trim());
  const DUMMY_HASH = '$2a$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUV0123456789';
  const hashToCompare = user ? user.password_hash : DUMMY_HASH;
  const isPasswordValid = bcrypt.compareSync(password, hashToCompare);

  if (!user || !isPasswordValid) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, tokenVersion: user.token_version || 0 },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      avatar: user.avatar || ''
    }
  });
});

/* --- WebAuthn Passkey Routes --- */

// POST /api/auth/passkey/register-options
app.post('/api/auth/passkey/register-options', authenticate, async (req, res) => {
  try {
    const { rpID, rpName } = getWebAuthnConfig(req);
    const existing = db.prepare('SELECT id, transports FROM authenticators WHERE user_id = ?').all(req.user.id);
    const excludeCredentials = existing.map(a => ({
      id: a.id,
      transports: safeJsonParse(a.transports, [])
    }));

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new Uint8Array(Buffer.from(req.user.id)),
      userName: req.user.username,
      userDisplayName: [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || req.user.username,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    const challengeId = crypto.randomUUID();
    webauthnChallenges.set(challengeId, {
      challenge: options.challenge,
      userId: req.user.id,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    res.json({ options, challengeId });
  } catch (err) {
    console.error('Error generating passkey registration options:', err);
    res.status(500).json({ error: 'Failed to generate passkey registration options' });
  }
});

// POST /api/auth/passkey/register-verify
app.post('/api/auth/passkey/register-verify', authenticate, async (req, res) => {
  try {
    const { response, challengeId, deviceName } = req.body;
    if (!response || !challengeId) {
      return res.status(400).json({ error: 'Missing response or challengeId' });
    }

    const stored = webauthnChallenges.get(challengeId);
    webauthnChallenges.delete(challengeId);
    if (!stored || stored.userId !== req.user.id || stored.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Challenge expired or invalid. Please try again.' });
    }

    const { rpID, expectedOrigin } = getWebAuthnConfig(req);
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'Passkey verification failed' });
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    const now = new Date().toISOString();

    const existingAuth = db.prepare('SELECT user_id FROM authenticators WHERE id = ?').get(credential.id);
    if (existingAuth && existingAuth.user_id !== req.user.id) {
      return res.status(409).json({ error: 'Passkey already registered to another user' });
    }

    db.prepare(`
      INSERT OR REPLACE INTO authenticators (
        id, user_id, public_key, counter, device_type, backed_up, transports, device_name, created_at, last_used_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      credential.id,
      req.user.id,
      Buffer.from(credential.publicKey),
      credential.counter,
      credentialDeviceType,
      credentialBackedUp ? 1 : 0,
      JSON.stringify(credential.transports || []),
      deviceName?.trim() || 'Passkey',
      now,
      now
    );

    res.json({
      verified: true,
      passkey: {
        id: credential.id,
        deviceName: deviceName?.trim() || 'Passkey',
        createdAt: now
      }
    });
  } catch (err) {
    console.error('Error verifying passkey registration:', err);
    res.status(400).json({ error: err.message || 'Passkey verification failed' });
  }
});

// POST /api/auth/passkey/login-options
app.post('/api/auth/passkey/login-options', async (req, res) => {
  try {
    const { username } = req.body || {};
    const { rpID } = getWebAuthnConfig(req);
    let allowCredentials = [];

    if (username && typeof username === 'string') {
      const user = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(username.trim());
      if (user) {
        const authenticators = db.prepare('SELECT id, transports FROM authenticators WHERE user_id = ?').all(user.id);
        allowCredentials = authenticators.map(a => ({
          id: a.id,
          transports: safeJsonParse(a.transports, [])
        }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    const challengeId = crypto.randomUUID();
    webauthnChallenges.set(challengeId, {
      challenge: options.challenge,
      username: username?.trim(),
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    res.json({ options, challengeId });
  } catch (err) {
    console.error('Error generating passkey login options:', err);
    res.status(500).json({ error: 'Failed to generate passkey login options' });
  }
});

// POST /api/auth/passkey/login-verify
app.post('/api/auth/passkey/login-verify', rateLimitAuth(20, 60000), async (req, res) => {
  try {
    const { response, challengeId } = req.body;
    if (!response || !challengeId) {
      return res.status(400).json({ error: 'Missing response or challengeId' });
    }

    const stored = webauthnChallenges.get(challengeId);
    webauthnChallenges.delete(challengeId);
    if (!stored || stored.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Challenge expired or invalid. Please try again.' });
    }

    const authenticator = db.prepare('SELECT * FROM authenticators WHERE id = ?').get(response.id);
    if (!authenticator) {
      return res.status(400).json({ error: 'Passkey not recognized' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(authenticator.user_id);
    if (!user) {
      return res.status(400).json({ error: 'User associated with this passkey not found' });
    }

    const { rpID, expectedOrigin } = getWebAuthnConfig(req);
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: {
        id: authenticator.id,
        publicKey: new Uint8Array(authenticator.public_key),
        counter: authenticator.counter,
        transports: safeJsonParse(authenticator.transports, []),
      },
    });

    if (!verification.verified) {
      return res.status(400).json({ error: 'Passkey authentication failed' });
    }

    const { newCounter } = verification.authenticationInfo;
    const now = new Date().toISOString();
    db.prepare('UPDATE authenticators SET counter = ?, last_used_at = ? WHERE id = ?')
      .run(newCounter, now, authenticator.id);

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, tokenVersion: user.token_version || 0 },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        avatar: user.avatar || ''
      }
    });
  } catch (err) {
    console.error('Error verifying passkey login:', err);
    res.status(400).json({ error: err.message || 'Passkey authentication failed' });
  }
});

// GET /api/auth/passkeys
app.get('/api/auth/passkeys', authenticate, (req, res) => {
  const passkeys = db.prepare(`
    SELECT id, device_name as deviceName, device_type as deviceType, backed_up as backedUp, created_at as createdAt, last_used_at as lastUsedAt
    FROM authenticators
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(req.user.id);
  res.json({ passkeys });
});

// DELETE /api/auth/passkeys/:id
app.delete('/api/auth/passkeys/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM authenticators WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

// PATCH /api/auth/passkeys/:id
app.patch('/api/auth/passkeys/:id', authenticate, (req, res) => {
  const { deviceName } = req.body;
  if (!deviceName || !deviceName.trim()) {
    return res.status(400).json({ error: 'Device name is required' });
  }
  db.prepare('UPDATE authenticators SET device_name = ? WHERE id = ? AND user_id = ?').run(deviceName.trim(), req.params.id, req.user.id);
  res.json({ success: true });
});

// GET /api/auth/me
app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/profile
app.put('/api/auth/profile', authenticate, (req, res) => {
  const { firstName, lastName, avatar } = req.body;

  let validatedAvatar = '';
  if (avatar !== undefined && avatar !== null) {
    if (typeof avatar !== 'string') {
      return res.status(400).json({ error: 'avatar_invalid', message: 'Avatar must be a string' });
    }
    if (avatar.trim().length > 0) {
      if (avatar.length > 7 * 1024 * 1024) {
        return res.status(400).json({ error: 'avatar_too_large', message: 'Avatar image must be under 5MB' });
      }
      const isAllowedImage = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar.trim());
      if (!isAllowedImage) {
        return res.status(400).json({
          error: 'avatar_invalid_format',
          message: 'Avatar must be a valid PNG, JPEG, or WebP base64 image'
        });
      }
      validatedAvatar = avatar.trim();
    }
  } else {
    const existing = db.prepare('SELECT avatar FROM users WHERE id = ?').get(req.user.id);
    validatedAvatar = existing?.avatar || '';
  }

  const cleanFirst = typeof firstName === 'string' ? firstName.trim().slice(0, 50) : (req.user.firstName || '');
  const cleanLast = typeof lastName === 'string' ? lastName.trim().slice(0, 50) : (req.user.lastName || '');
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE users
    SET first_name = ?, last_name = ?, avatar = ?, updated_at = ?
    WHERE id = ?
  `).run(
    cleanFirst,
    cleanLast,
    validatedAvatar,
    now,
    req.user.id
  );

  const updatedUser = db.prepare('SELECT id, username, role, first_name, last_name, avatar FROM users WHERE id = ?').get(req.user.id);
  res.json({
    user: {
      id: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
      firstName: updatedUser.first_name || '',
      lastName: updatedUser.last_name || '',
      avatar: updatedUser.avatar || ''
    }
  });
});

// PUT /api/auth/password
app.put('/api/auth/password', authenticate, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters long' });
  }

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Incorrect current password' });
  }

  const salt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(newPassword, salt);
  const now = new Date().toISOString();

  db.prepare('UPDATE users SET password_hash = ?, token_version = token_version + 1, updated_at = ? WHERE id = ?').run(newHash, now, req.user.id);
  res.json({ success: true });
});

/* --- Admin Routes --- */

// GET /api/admin/users
app.get('/api/admin/users', authenticate, requireAdmin, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, username, first_name, last_name, avatar, role, created_at, updated_at
      FROM users
      ORDER BY created_at ASC
    `).all();

    res.json({
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        firstName: u.first_name || '',
        lastName: u.last_name || '',
        avatar: u.avatar || '',
        role: u.role,
        createdAt: u.created_at,
        updatedAt: u.updated_at
      }))
    });
  } catch (err) {
    console.error('Failed to fetch users:', err);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// POST /api/admin/users
app.post('/api/admin/users', authenticate, requireAdmin, (req, res) => {
  try {
    const { username, password, firstName, lastName, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const cleanUsername = username.trim();
    if (cleanUsername.length < 2) {
      return res.status(400).json({ error: 'Username must be at least 2 characters long' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long' });
    }

    const userRole = role === 'admin' ? 'admin' : 'user';

    const existing = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(cleanUsername);
    if (existing) {
      return res.status(409).json({ error: 'username_taken' });
    }

    const id = crypto.randomUUID();
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, username, password_hash, first_name, last_name, avatar, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      cleanUsername,
      passwordHash,
      firstName?.trim() || '',
      lastName?.trim() || '',
      '',
      userRole,
      now,
      now
    );

    res.status(201).json({
      user: {
        id,
        username: cleanUsername,
        firstName: firstName?.trim() || '',
        lastName: lastName?.trim() || '',
        avatar: '',
        role: userRole,
        createdAt: now
      }
    });
  } catch (err) {
    console.error('Failed to create user:', err);
    res.status(500).json({ error: 'create_failed' });
  }
});

// PUT /api/admin/users/:id
app.put('/api/admin/users/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let targetRole = user.role;
    if (role !== undefined) {
      targetRole = role === 'admin' ? 'admin' : 'user';
    }

    const isDefaultAdmin = id === 'admin-default' || user.username.toLowerCase() === 'admin';
    if (isDefaultAdmin && targetRole !== 'admin') {
      return res.status(400).json({ error: 'cannot_demote_default_admin' });
    }

    if (user.role === 'admin' && targetRole === 'user') {
      const adminCount = db.prepare('SELECT COUNT(*) as c FROM users WHERE role = ?').get('admin').c;
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'cannot_demote_sole_admin' });
      }
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE users
      SET first_name = ?, last_name = ?, role = ?, updated_at = ?
      WHERE id = ?
    `).run(
      firstName !== undefined ? String(firstName).trim() : user.first_name,
      lastName !== undefined ? String(lastName).trim() : user.last_name,
      targetRole,
      now,
      id
    );

    const updated = db.prepare('SELECT id, username, first_name, last_name, avatar, role, created_at FROM users WHERE id = ?').get(id);
    res.json({
      user: {
        id: updated.id,
        username: updated.username,
        firstName: updated.first_name || '',
        lastName: updated.last_name || '',
        avatar: updated.avatar || '',
        role: updated.role,
        createdAt: updated.created_at
      }
    });
  } catch (err) {
    console.error('Failed to update user:', err);
    res.status(500).json({ error: 'update_failed' });
  }
});

// PUT /api/admin/users/:id/password
app.put('/api/admin/users/:id/password', authenticate, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long' });
    }

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const now = new Date().toISOString();

    db.prepare('UPDATE users SET password_hash = ?, token_version = token_version + 1, updated_at = ? WHERE id = ?').run(passwordHash, now, id);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to reset password:', err);
    res.status(500).json({ error: 'password_reset_failed' });
  }
});

// DELETE /api/admin/users/:id
app.delete('/api/admin/users/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'cannot_delete_self' });
    }

    const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      const adminCount = db.prepare('SELECT COUNT(*) as c FROM users WHERE role = ?').get('admin').c;
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'cannot_delete_sole_admin' });
      }
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete user:', err);
    res.status(500).json({ error: 'delete_failed' });
  }
});

// GET /api/users
app.get('/api/users', authenticate, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, username, first_name, last_name, avatar
      FROM users
      ORDER BY username ASC
    `).all();

    res.json({
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        firstName: u.first_name || '',
        lastName: u.last_name || '',
        avatar: u.avatar || ''
      }))
    });
  } catch (err) {
    console.error('Failed to list users:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

/* --- Incidents & Homework Placeholders (Ready for Webtop Integration) --- */

// GET /api/incidents
app.get('/api/incidents', authenticate, (req, res) => {
  try {
    const incidents = db.prepare(`
      SELECT id, student_name as studentName, date, type, description, teacher, raw_data as rawData, created_at as createdAt
      FROM incidents
      WHERE user_id = ?
      ORDER BY date DESC
    `).all(req.user.id);

    res.json({ incidents });
  } catch (err) {
    console.error('Failed to fetch incidents:', err);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

// GET /api/homework
app.get('/api/homework', authenticate, (req, res) => {
  try {
    const homework = db.prepare(`
      SELECT id, student_name as studentName, subject, due_date as dueDate, description, completed, raw_data as rawData, created_at as createdAt
      FROM homework
      WHERE user_id = ?
      ORDER BY due_date DESC
    `).all(req.user.id);

    res.json({ homework });
  } catch (err) {
    console.error('Failed to fetch homework:', err);
    res.status(500).json({ error: 'Failed to fetch homework' });
  }
});

// Catch-all 404 for undefined /api routes
app.all(/^\/api(\/.*)?$/, (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global API error handler
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large' || err.status === 413 || err.statusCode === 413) {
    return res.status(413).json({
      error: 'payload_too_large',
      message: 'Request payload is too large. Maximum size is 5MB.'
    });
  }

  console.error('Unhandled server error:', err);
  if (req.path.startsWith('/api') || req.originalUrl?.startsWith('/api')) {
    const isProd = process.env.NODE_ENV === 'production';
    const message = isProd ? 'Internal server error' : (err.message || 'Internal server error');
    return res.status(500).json({ error: message });
  }
  next(err);
});

// SPA fallback
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`School server running on http://localhost:${PORT}`);
});

export default app;

