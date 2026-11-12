import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { createAutoSync } from './autoSync.js';
import { webtopLog, maskUser } from './webtopLogger.js';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import db, { initDb } from './db.js';
import { WebtopClient, WebtopAuthError, clearWebtopSession, encryptPassword, decryptPassword, getWebtopStudyYear, setEncryptionSecret, matchChildWithPrevious, generateChildId } from './webtop.js';
import { getWebAuthnConfig, resolveTrustProxy } from './webauthn-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', resolveTrustProxy());
const PORT = process.env.PORT || 3001;

// Rate limiter for sensitive authentication endpoints (CodeQL js/missing-rate-limiting & CWE-307)
function rateLimitAuth(maxAttempts = (process.env.NODE_ENV === 'test' ? 1000 : 20), windowMs = 60 * 1000) {
  return rateLimit({
    windowMs,
    limit: maxAttempts,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => {
      const userPart = req.body?.username ? `:${String(req.body.username).toLowerCase().trim()}` : '';
      return `${ipKeyGenerator(req.ip || '127.0.0.1')}${userPart}`;
    },
    message: {
      error: 'too_many_requests',
      message: 'Too many authentication attempts. Please try again in a minute.'
    }
  });
}

// In-memory WebAuthn challenges: challengeId -> { challenge, userId, username, expiresAt }
const webauthnChallenges = new Map();
const MAX_CHALLENGES = 1000;

function storeWebAuthnChallenge(challengeId, challengeData) {
  const now = Date.now();
  if (webauthnChallenges.size >= MAX_CHALLENGES) {
    for (const [id, val] of webauthnChallenges.entries()) {
      if (val.expiresAt < now) {
        webauthnChallenges.delete(id);
      }
    }
    if (webauthnChallenges.size >= MAX_CHALLENGES) {
      const oldestKey = webauthnChallenges.keys().next().value;
      if (oldestKey) webauthnChallenges.delete(oldestKey);
    }
  }
  webauthnChallenges.set(challengeId, challengeData);
}

// Periodic cleanup of expired challenges every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, val] of webauthnChallenges.entries()) {
    if (val.expiresAt < now) {
      webauthnChallenges.delete(id);
    }
  }
}, 5 * 60 * 1000).unref();

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

function getOrCreateEncryptionSecret() {
  if (process.env.ENCRYPTION_KEY) {
    return process.env.ENCRYPTION_KEY;
  }

  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('encryption_secret');
  if (row?.value) {
    return row.value;
  }

  const generated = crypto.randomBytes(64).toString('hex');
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('encryption_secret', generated);
  return generated;
}

const JWT_SECRET = getOrCreateJwtSecret();
const ENCRYPTION_SECRET = getOrCreateEncryptionSecret();
setEncryptionSecret(ENCRYPTION_SECRET);

// Migrate any legacy-encrypted credentials to the active dynamic encryption secret
try {
  const credentials = db.prepare('SELECT id, encrypted_password FROM webtop_credentials').all();
  for (const cred of credentials) {
    try {
      const parts = cred.encrypted_password.split(':');
      if (parts.length === 3) {
        const [ivHex, authTagHex, encryptedHex] = parts;
        const keyBytes = crypto.scryptSync(ENCRYPTION_SECRET, 'school-db-salt', 32);
        const decipher = crypto.createDecipheriv('aes-256-gcm', keyBytes, Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
        decipher.update(encryptedHex, 'hex', 'utf8');
        decipher.final('utf8');
      }
    } catch {
      try {
        const plain = decryptPassword(cred.encrypted_password);
        const upgraded = encryptPassword(plain);
        db.prepare('UPDATE webtop_credentials SET encrypted_password = ? WHERE id = ?').run(upgraded, cred.id);
      } catch (migrationErr) {
        console.warn(`[Webtop] Could not migrate credentials for ID ${cred.id}:`, migrationErr.message);
      }
    }
  }
} catch {
  // Ignored if table does not exist yet
}

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

// Global rate limiter to protect all database, filesystem, and backend operations (CodeQL js/missing-rate-limiting)
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: process.env.NODE_ENV === 'test' ? 10000 : 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: 'too_many_requests',
    message: 'Too many requests, please try again later.'
  }
});
app.use(globalRateLimiter);

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
    const user = db.prepare('SELECT id, username, role, family_role, linked_child_id, first_name, last_name, token_version FROM users WHERE id = ?').get(payload.id);
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
      familyRole: user.role === 'admin' ? 'parent' : (user.family_role || 'parent'),
      linkedChildId: user.role === 'admin' ? null : (user.linked_child_id || null),
      firstName: user.first_name || '',
      lastName: user.last_name || ''
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

export function requireParent(req, res, next) {
  if (req.user?.familyRole !== 'parent' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Parent access required' });
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
      familyRole: user.role === 'admin' ? 'parent' : (user.family_role || 'parent'),
      linkedChildId: user.role === 'admin' ? null : (user.linked_child_id || null),
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
    storeWebAuthnChallenge(challengeId, {
      challenge: options.challenge,
      userId: req.user.id,
      expiresAt: Date.now() + 2 * 60 * 1000,
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
app.post('/api/auth/passkey/login-options', rateLimitAuth(20, 60000), async (req, res) => {
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
    storeWebAuthnChallenge(challengeId, {
      challenge: options.challenge,
      username: username?.trim(),
      expiresAt: Date.now() + 2 * 60 * 1000,
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
        familyRole: user.role === 'admin' ? 'parent' : (user.family_role || 'parent'),
        linkedChildId: user.role === 'admin' ? null : (user.linked_child_id || null),
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
  const row = db.prepare('SELECT avatar FROM users WHERE id = ?').get(req.user.id);
  res.json({
    user: {
      ...req.user,
      avatar: row?.avatar || ''
    }
  });
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

  const updatedUser = db.prepare('SELECT id, username, role, family_role, linked_child_id, first_name, last_name, avatar FROM users WHERE id = ?').get(req.user.id);
  res.json({
    user: {
      id: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
      familyRole: updatedUser.role === 'admin' ? 'parent' : (updatedUser.family_role || 'parent'),
      linkedChildId: updatedUser.role === 'admin' ? null : (updatedUser.linked_child_id || null),
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
      SELECT id, username, first_name, last_name, avatar, role, family_role, linked_child_id, created_at, updated_at
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
        familyRole: u.role === 'admin' ? 'parent' : (u.family_role || 'parent'),
        linkedChildId: u.role === 'admin' ? null : (u.linked_child_id || null),
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
    const { username, password, firstName, lastName, role, familyRole, linkedChildId } = req.body;
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
    if (userRole === 'admin' && familyRole === 'child') {
      return res.status(400).json({ error: 'admin_must_be_parent' });
    }

    const userFamilyRole = userRole === 'admin' ? 'parent' : (familyRole === 'child' ? 'child' : 'parent');
    const userLinkedChildId = userFamilyRole === 'child' ? (linkedChildId ? String(linkedChildId).trim() : null) : null;

    const existing = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(cleanUsername);
    if (existing) {
      return res.status(409).json({ error: 'username_taken' });
    }

    const id = crypto.randomUUID();
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, username, password_hash, first_name, last_name, avatar, role, family_role, linked_child_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      cleanUsername,
      passwordHash,
      firstName?.trim() || '',
      lastName?.trim() || '',
      '',
      userRole,
      userFamilyRole,
      userLinkedChildId,
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
        familyRole: userFamilyRole,
        linkedChildId: userLinkedChildId,
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
    const { firstName, lastName, role, familyRole, linkedChildId } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let targetRole = user.role;
    if (role !== undefined) {
      targetRole = role === 'admin' ? 'admin' : 'user';
    }

    let targetFamilyRole = user.family_role || 'parent';
    if (familyRole !== undefined) {
      targetFamilyRole = familyRole === 'child' ? 'child' : 'parent';
    }

    if (targetRole === 'admin') {
      if (familyRole === 'child') {
        return res.status(400).json({ error: 'admin_must_be_parent' });
      }
      targetFamilyRole = 'parent';
    }

    let targetLinkedChildId = user.linked_child_id;
    if (targetFamilyRole === 'parent') {
      targetLinkedChildId = null;
    } else if (linkedChildId !== undefined) {
      targetLinkedChildId = linkedChildId ? String(linkedChildId).trim() : null;
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
      SET first_name = ?, last_name = ?, role = ?, family_role = ?, linked_child_id = ?, updated_at = ?
      WHERE id = ?
    `).run(
      firstName !== undefined ? String(firstName).trim() : user.first_name,
      lastName !== undefined ? String(lastName).trim() : user.last_name,
      targetRole,
      targetFamilyRole,
      targetLinkedChildId,
      now,
      id
    );

    const updated = db.prepare('SELECT id, username, first_name, last_name, avatar, role, family_role, linked_child_id, created_at FROM users WHERE id = ?').get(id);
    res.json({
      user: {
        id: updated.id,
        username: updated.username,
        firstName: updated.first_name || '',
        lastName: updated.last_name || '',
        avatar: updated.avatar || '',
        role: updated.role,
        familyRole: updated.role === 'admin' ? 'parent' : (updated.family_role || 'parent'),
        linkedChildId: updated.role === 'admin' ? null : (updated.linked_child_id || null),
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
app.get('/api/users', authenticate, requireAdmin, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, username, first_name, last_name
      FROM users
      ORDER BY username ASC
    `).all();

    res.json({
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        firstName: u.first_name || '',
        lastName: u.last_name || ''
      }))
    });
  } catch (err) {
    console.error('Failed to list users:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

/* --- Webtop Sync & Data Endpoints --- */

// Wrong-password failures are lockout events; everything else is a regular failure.
function logWebtopFailure(context, err) {
  if (err instanceof WebtopAuthError) {
    webtopLog.lockout(`${context}: ${err.message}`);
  } else {
    webtopLog.warn(`${context}: ${err?.message || err}`);
  }
}

async function syncWebtopData() {
  const creds = db.prepare('SELECT * FROM webtop_credentials ORDER BY updated_at DESC LIMIT 1').get();
  if (!creds) {
    throw new Error('Webtop credentials not configured');
  }

  const plainPassword = decryptPassword(creds.encrypted_password);

  // Transparently re-encrypt credentials if stored under legacy secret
  try {
    const keyBytes = crypto.scryptSync(ENCRYPTION_SECRET, 'school-db-salt', 32);
    const parts = creds.encrypted_password.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBytes, Buffer.from(parts[0], 'hex'));
    decipher.setAuthTag(Buffer.from(parts[1], 'hex'));
    decipher.update(parts[2], 'hex', 'utf8');
    decipher.final('utf8');
  } catch {
    try {
      const upgraded = encryptPassword(plainPassword);
      db.prepare('UPDATE webtop_credentials SET encrypted_password = ? WHERE id = ?').run(upgraded, creds.id);
    } catch {
      // Ignore background upgrade failure
    }
  }

  webtopLog.info('Sync started', { user: maskUser(creds.username) });
  const syncStartedAt = Date.now();
  const client = new WebtopClient();
  await client.useSession(creds.username, plainPassword);

  const dash = await client.initDashboard();
  const rawChildren = dash.childrens || [];
  const now = new Date().toISOString();

  // Upsert into dedicated relational children table
  const upsertChild = db.prepare(`
    INSERT INTO children (id, user_id, first_name, last_name, class_code, class_num, cellphone, external_id, external_source, created_at, updated_at)
    VALUES (?, 'family', ?, ?, ?, ?, ?, ?, 'webtop', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      class_code = excluded.class_code,
      class_num = excluded.class_num,
      cellphone = excluded.cellphone,
      external_id = excluded.external_id,
      updated_at = excluded.updated_at
  `);

  for (const c of rawChildren) {
    if (!c.firstName && !c.lastName) continue;
    const childId = generateChildId(c.firstName, c.lastName);
    upsertChild.run(
      childId,
      (c.firstName || '').trim(),
      (c.lastName || '').trim(),
      c.classCode || null,
      c.classNum || null,
      c.cellphone || null,
      c.id || null,
      now,
      now
    );
  }

  // Load refreshed children from children table
  const linkedChildren = db.prepare(`
    SELECT id, first_name as firstName, last_name as lastName, class_code as classCode, class_num as classNum, cellphone, color, external_id as externalId
    FROM children
    WHERE external_source = 'webtop'
    ORDER BY class_code ASC, first_name ASC
  `).all();

  let selectedChildId = creds.selected_child_id;
  if (selectedChildId === 'all') {
    // Retain 'all' view
  } else if (!selectedChildId || !linkedChildren.some(c => c.id === selectedChildId)) {
    // If prior selection was an ephemeral token from older schema, map it to the deterministic ID
    const prevMatched = linkedChildren.find(c => c.externalId === selectedChildId);
    selectedChildId = prevMatched ? prevMatched.id : (linkedChildren[0]?.id || null);
  }

  // Update credentials row with active selected child & syncing status
  db.prepare(`
    UPDATE webtop_credentials
    SET selected_child_id = ?, sync_status = 'syncing', updated_at = ?
    WHERE id = ?
  `).run(selectedChildId, now, creds.id);

  const allIncidents = [];
  const allHomework = [];

  for (const child of linkedChildren) {
    const childFullName = `${child.firstName} ${child.lastName}`.trim();
    const sanitizedChild = childFullName.replace(/[^\w\u0590-\u05fe]/g, '_');
    const childId = child.id;
    const externalChildId = child.externalId || child.id;

    // 1. Incidents
    try {
      const incidents = await client.getIncidents(externalChildId, child.classCode);
      for (const ev of incidents) {
        allIncidents.push({
          id: `webtop-inc-family-${ev.eventID || crypto.randomUUID()}`,
          userId: 'family',
          childId,
          studentId: externalChildId,
          studentName: childFullName,
          date: ev.eventDate ? ev.eventDate.split('T')[0] : new Date().toISOString().split('T')[0],
          type: ev.eventType || '',
          subject: ev.subjectName || '',
          teacher: ev.teacherName || '',
          description: ev.remark || ev.justifiedRemark || '',
          hourNum: ev.hourNum || null,
          isJustified: ev.isJustified ? 1 : 0,
          eventCode: ev.eventCode || null,
          rawData: JSON.stringify(ev)
        });
      }
    } catch (e) {
      if (e instanceof WebtopAuthError) throw e;
      webtopLog.warn(`Failed to fetch incidents for child ${child.id}: ${e.message}`);
    }

    // 2. Homework & Weekly Lessons across past weeks (current week + last 3 weeks)
    try {
      const studyYear = getWebtopStudyYear();
      const weeksToFetch = [0, -1, -2, -3];

      for (const weekOffset of weeksToFetch) {
        try {
          const days = await client.getWeeklyLessonsAndHomework(externalChildId, child.classCode, studyYear, weekOffset);
          for (const day of days) {
            const dayDate = day.date ? day.date.split('T')[0] : null;
            if (!dayDate) continue;

            const hoursData = Array.isArray(day.hoursData) ? day.hoursData : [];
            for (const hourSlot of hoursData) {
              const lessons = Array.isArray(hourSlot.scheduale) ? hourSlot.scheduale : [];
              for (const item of lessons) {
                const homeworkText = item.homeWork ? item.homeWork.trim() : '';
                const topicText = item.descClass ? item.descClass.trim() : '';

                // Only record entries that have homework or a lesson topic
                if (!homeworkText && !topicText) continue;

                const hourNum = (item.hour_no !== undefined && item.hour_no !== null)
                  ? parseInt(item.hour_no, 10)
                  : (hourSlot.hour !== undefined && hourSlot.hour !== null ? parseInt(hourSlot.hour, 10) : null);

                const subject = (item.subject_name || item.subject || '').trim();
                const sanitizedSubject = subject.replace(/[^\w\u0590-\u05fe]/g, '_');
                const hwId = `webtop-hw-family-${sanitizedChild}-${dayDate}-${hourNum !== null && !isNaN(hourNum) ? hourNum : '0'}-${sanitizedSubject}`;

                allHomework.push({
                  id: hwId,
                  userId: 'family',
                  childId,
                  studentId: externalChildId,
                  studentName: childFullName,
                  subject: subject || 'כללי',
                  teacher: (item.teacher || '').trim(),
                  dueDate: dayDate,
                  description: homeworkText || topicText,
                  lessonSubject: topicText,
                  hourNum: (hourNum !== null && !isNaN(hourNum)) ? hourNum : null,
                  rawData: JSON.stringify({ ...item, dayDate, weekOffset })
                });
              }
            }
          }
        } catch (weekErr) {
          if (weekErr instanceof WebtopAuthError) throw weekErr;
          webtopLog.warn(`Failed to fetch weekly lessons/homework for child ${child.id} (week ${weekOffset}): ${weekErr.message}`);
        }
      }
    } catch (e) {
      if (e instanceof WebtopAuthError) throw e;
      webtopLog.warn(`Failed to fetch weekly homework for child ${child.id}: ${e.message}`);
    }

    // Fallback/supplemental: fetch today's dashboard homework
    try {
      const hwLessons = await client.getHomework(externalChildId, child.classCode, child.classNum);
      const today = new Date().toISOString().split('T')[0];
      for (const item of hwLessons) {
        const desc = item.homeworkData || item.lessonSubject || '';
        if (!desc.trim()) continue;
        const hourNum = item.hourNum ? parseInt(item.hourNum, 10) : null;
        const subject = (item.lesson || '').trim();
        const sanitizedSubject = subject.replace(/[^\w\u0590-\u05fe]/g, '_');
        const hwId = `webtop-hw-family-${sanitizedChild}-${today}-${hourNum !== null && !isNaN(hourNum) ? hourNum : '0'}-${sanitizedSubject}`;

        allHomework.push({
          id: hwId,
          userId: 'family',
          childId,
          studentId: externalChildId,
          studentName: childFullName,
          subject: subject || 'כללי',
          teacher: (item.teacher || '').trim(),
          dueDate: today,
          description: desc.trim(),
          lessonSubject: (item.lessonSubject || '').trim(),
          hourNum: (hourNum !== null && !isNaN(hourNum)) ? hourNum : null,
          rawData: JSON.stringify(item)
        });
      }
    } catch (e) {
      if (e instanceof WebtopAuthError) throw e;
      webtopLog.warn(`Failed to fetch dashboard homework for child ${child.id}: ${e.message}`);
    }
  }

  // Deduplicate homework by ID
  const uniqueHomeworkMap = new Map();
  for (const hw of allHomework) {
    uniqueHomeworkMap.set(hw.id, hw);
  }
  const dedupedHomework = Array.from(uniqueHomeworkMap.values());

  // Atomically update DB records for the family
  const syncTx = db.transaction(() => {
    // Keep historical student_id & child_id in incidents & homework synchronized
    const updateIncidentStudentId = db.prepare(`
      UPDATE incidents
      SET child_id = ?, student_id = ?
      WHERE student_name = ? OR child_id = ? OR student_id = ?
    `);
    const updateHomeworkStudentId = db.prepare(`
      UPDATE homework
      SET child_id = ?, student_id = ?
      WHERE student_name = ? OR child_id = ? OR student_id = ?
    `);

    for (const child of linkedChildren) {
      const childFullName = `${child.firstName} ${child.lastName}`.trim();
      updateIncidentStudentId.run(child.id, child.externalId, childFullName, child.id, child.externalId);
      updateHomeworkStudentId.run(child.id, child.externalId, childFullName, child.id, child.externalId);
    }

    // Deduplicate existing incidents by eventID (or canonical attributes) and remove legacy user-scoped duplicates
    const existingIncidents = db.prepare(`
      SELECT id, user_id, child_id, student_name, date, type, subject, hour_num, event_code, raw_data
      FROM incidents
      WHERE user_id != 'family' AND id LIKE 'webtop-inc-%'
    `).all();
    for (const oldInc of existingIncidents) {
      let evId = null;
      if (oldInc.raw_data) {
        try {
          const parsed = JSON.parse(oldInc.raw_data);
          if (parsed && parsed.eventID) evId = String(parsed.eventID);
        } catch {}
      }
      if (!evId && oldInc.id.startsWith(`webtop-inc-${oldInc.user_id}-`)) {
        evId = oldInc.id.slice(`webtop-inc-${oldInc.user_id}-`.length);
      }
      if (evId) {
        const canonicalFamilyId = `webtop-inc-family-${evId}`;
        const hasCanonical = allIncidents.some(i => i.id === canonicalFamilyId) ||
          db.prepare('SELECT 1 FROM incidents WHERE id = ?').get(canonicalFamilyId);
        if (hasCanonical) {
          db.prepare('DELETE FROM incidents WHERE id = ?').run(oldInc.id);
        } else {
          db.prepare('UPDATE incidents SET id = ?, user_id = ? WHERE id = ?').run(canonicalFamilyId, 'family', oldInc.id);
        }
      }
    }

    // Upsert incidents
    const upsertIncident = db.prepare(`
      INSERT INTO incidents (id, user_id, child_id, student_id, student_name, date, type, subject, teacher, description, hour_num, is_justified, event_code, raw_data, created_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        child_id = excluded.child_id,
        student_id = excluded.student_id,
        student_name = excluded.student_name,
        date = excluded.date,
        type = excluded.type,
        subject = excluded.subject,
        teacher = excluded.teacher,
        description = excluded.description,
        hour_num = excluded.hour_num,
        is_justified = excluded.is_justified,
        event_code = excluded.event_code,
        raw_data = excluded.raw_data
    `);

    for (const inc of allIncidents) {
      upsertIncident.run(
        inc.id, inc.childId, inc.studentId, inc.studentName, inc.date, inc.type,
        inc.subject, inc.teacher, inc.description, inc.hourNum, inc.isJustified,
        inc.eventCode, inc.rawData, new Date().toISOString()
      );
    }

    // Deduplicate existing homework and remove legacy user-scoped duplicates
    const existingLegacyHw = db.prepare(`
      SELECT id, user_id, student_name, subject, due_date, hour_num, completed
      FROM homework
      WHERE user_id != 'family' AND id LIKE 'webtop-hw-%'
    `).all();
    for (const oldHw of existingLegacyHw) {
      const sanitizedChild = (oldHw.student_name || '').trim().replace(/[^\w\u0590-\u05fe]/g, '_');
      const subject = (oldHw.subject || 'כללי').trim();
      const sanitizedSubject = subject.replace(/[^\w\u0590-\u05fe]/g, '_');
      const hour = (oldHw.hour_num !== null && !isNaN(oldHw.hour_num)) ? oldHw.hour_num : '0';
      const canonicalFamilyHwId = `webtop-hw-family-${sanitizedChild}-${oldHw.due_date}-${hour}-${sanitizedSubject}`;
      const existingFam = db.prepare('SELECT id, completed FROM homework WHERE id = ?').get(canonicalFamilyHwId);
      if (existingFam || dedupedHomework.some(h => h.id === canonicalFamilyHwId)) {
        if (oldHw.completed && existingFam && !existingFam.completed) {
          db.prepare('UPDATE homework SET completed = 1 WHERE id = ?').run(canonicalFamilyHwId);
        }
        db.prepare('DELETE FROM homework WHERE id = ?').run(oldHw.id);
      } else {
        db.prepare('UPDATE homework SET id = ?, user_id = ? WHERE id = ?').run(canonicalFamilyHwId, 'family', oldHw.id);
      }
    }

    // Upsert homework
    const upsertHw = db.prepare(`
      INSERT INTO homework (id, user_id, child_id, student_id, student_name, subject, teacher, due_date, description, lesson_subject, hour_num, raw_data, created_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        child_id = excluded.child_id,
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

    for (const hw of dedupedHomework) {
      upsertHw.run(
        hw.id, hw.childId, hw.studentId, hw.studentName, hw.subject,
        hw.teacher, hw.dueDate, hw.description, hw.lessonSubject, hw.hourNum,
        hw.rawData, new Date().toISOString()
      );
    }

    // Mark sync success
    db.prepare(`
      UPDATE webtop_credentials
      SET last_synced_at = ?, sync_status = 'success', sync_error = null, updated_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), new Date().toISOString(), creds.id);
  });

  syncTx();

  webtopLog.info('Sync finished', {
    children: linkedChildren.length,
    incidents: allIncidents.length,
    homework: allHomework.length,
    ms: Date.now() - syncStartedAt
  });

  return {
    childrenCount: linkedChildren.length,
    incidentsCount: allIncidents.length,
    homeworkCount: allHomework.length
  };
}

let activeSyncPromise = null;

async function runWebtopSync() {
  if (activeSyncPromise) {
    return activeSyncPromise;
  }
  activeSyncPromise = syncWebtopData()
    .then((result) => {
      autoSync.recordResult(null);
      return result;
    })
    .catch((err) => {
      autoSync.recordResult(err);
      throw err;
    })
    .finally(() => {
      activeSyncPromise = null;
    });
  return activeSyncPromise;
}

// Production-only background sync (no-op in development/test; see server/autoSync.js)
const autoSync = createAutoSync({ db, runSync: () => runWebtopSync() });

// GET /api/webtop/config
app.get('/api/webtop/config', authenticate, (req, res) => {
  try {
    const creds = db.prepare(`
      SELECT username, selected_child_id, last_synced_at, sync_status, sync_error
      FROM webtop_credentials
      ORDER BY updated_at DESC
      LIMIT 1
    `).get();

    if (!creds) {
      return res.json({
        configured: false,
        username: null,
        selectedChildId: null,
        linkedChildren: [],
        lastSyncedAt: null,
        syncStatus: 'idle',
        syncError: null,
        ...autoSync.getStatus()
      });
    }

    const allChildren = db.prepare(`
      SELECT id, first_name as firstName, last_name as lastName, class_code as classCode, class_num as classNum, cellphone, color, external_id as externalId
      FROM children
      WHERE external_source = 'webtop'
      ORDER BY class_code ASC, first_name ASC
    `).all();

    if (req.user.familyRole === 'child') {
      const childRecord = req.user.linkedChildId
        ? allChildren.find(c => c.id === req.user.linkedChildId || (c.externalId && c.externalId === req.user.linkedChildId))
        : null;
      return res.json({
        configured: true,
        username: null,
        selectedChildId: req.user.linkedChildId || null,
        linkedChildren: childRecord ? [childRecord] : [],
        lastSyncedAt: creds.last_synced_at,
        syncStatus: creds.sync_status,
        syncError: null,
        ...autoSync.getStatus()
      });
    }

    res.json({
      configured: true,
      username: creds.username,
      selectedChildId: creds.selected_child_id,
      linkedChildren: allChildren,
      lastSyncedAt: creds.last_synced_at,
      syncStatus: creds.sync_status,
      syncError: creds.sync_error,
      ...autoSync.getStatus()
    });
  } catch (err) {
    console.error('Failed to fetch Webtop config:', err);
    res.status(500).json({ error: 'Failed to fetch Webtop configuration' });
  }
});

// POST /api/webtop/test - verify credentials live without persisting
app.post('/api/webtop/test', authenticate, requireParent, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const client = new WebtopClient();
    const user = await client.login(username, password);
    const dash = await client.initDashboard();
    const rawChildren = dash.childrens || [];
    const children = rawChildren.map(c => ({
      id: generateChildId(c.firstName, c.lastName),
      externalId: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      classCode: c.classCode,
      classNum: c.classNum,
      cellphone: c.cellphone || null
    }));

    res.json({
      success: true,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        institutionName: user.school_name || ''
      },
      children
    });
  } catch (err) {
    logWebtopFailure('Webtop test login failed', err);
    res.status(400).json({ error: err.message || 'Webtop authentication failed' });
  }
});

// POST /api/webtop/config - save credentials & run initial sync (parent only)
app.post('/api/webtop/config', authenticate, requireParent, async (req, res) => {
  try {
    const { username, password, selectedChildId } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const client = new WebtopClient();
    await client.login(username, password);
    const dash = await client.initDashboard();
    const rawChildren = dash.childrens || [];
    const now = new Date().toISOString();

    const upsertChild = db.prepare(`
      INSERT INTO children (id, user_id, first_name, last_name, class_code, class_num, cellphone, external_id, external_source, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?, ?, 'webtop', ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        class_code = excluded.class_code,
        class_num = excluded.class_num,
        cellphone = excluded.cellphone,
        external_id = excluded.external_id,
        updated_at = excluded.updated_at
    `);

    for (const c of rawChildren) {
      if (!c.firstName && !c.lastName) continue;
      const childId = generateChildId(c.firstName, c.lastName);
      upsertChild.run(
        childId,
        (c.firstName || '').trim(),
        (c.lastName || '').trim(),
        c.classCode || null,
        c.classNum || null,
        c.cellphone || null,
        c.id || null,
        now,
        now
      );
    }

    const linkedChildren = db.prepare(`
      SELECT id, first_name as firstName, last_name as lastName, class_code as classCode, class_num as classNum, cellphone, color, external_id as externalId
      FROM children
      WHERE external_source = 'webtop'
      ORDER BY class_code ASC, first_name ASC
    `).all();

    let effectiveChildId = selectedChildId;
    if (effectiveChildId === 'all') {
      // Retain 'all' view
    } else if (effectiveChildId && linkedChildren.some(c => c.id === effectiveChildId)) {
      // Deterministic hash matches
    } else if (effectiveChildId && linkedChildren.some(c => c.externalId === effectiveChildId)) {
      effectiveChildId = linkedChildren.find(c => c.externalId === effectiveChildId).id;
    } else {
      effectiveChildId = linkedChildren[0]?.id || null;
    }

    clearWebtopSession(); // credentials changed: drop any cached session
    const encryptedPass = encryptPassword(password);
    const existing = db.prepare('SELECT id FROM webtop_credentials ORDER BY updated_at DESC LIMIT 1').get();

    if (existing) {
      db.prepare(`
        UPDATE webtop_credentials
        SET username = ?, encrypted_password = ?, selected_child_id = ?, updated_at = ?,
            consecutive_failures = 0, auto_sync_paused_reason = NULL
        WHERE id = ?
      `).run(username, encryptedPass, effectiveChildId, now, existing.id);
    } else {
      db.prepare(`
        INSERT INTO webtop_credentials (id, user_id, username, encrypted_password, selected_child_id, created_at, updated_at)
        VALUES (?, 'family', ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), username, encryptedPass, effectiveChildId, now, now);
    }

    let syncResult = null;
    try {
      syncResult = await syncWebtopData();
    } catch (syncErr) {
      logWebtopFailure('Initial sync warning', syncErr);
    }

    res.json({
      success: true,
      username,
      selectedChildId: effectiveChildId,
      linkedChildren,
      syncResult
    });
  } catch (err) {
    logWebtopFailure('Failed to configure Webtop', err);
    res.status(400).json({ error: err.message || 'Failed to configure Webtop' });
  }
});

// PATCH /api/webtop/child - switch active child (parent only)
app.patch('/api/webtop/child', authenticate, requireParent, (req, res) => {
  try {
    const { childId } = req.body;
    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }

    let targetChildId = childId;
    if (childId !== 'all') {
      const match = db.prepare(`
        SELECT id FROM children
        WHERE (id = ? OR external_id = ?)
      `).get(childId, childId);

      if (!match) {
        return res.status(400).json({ error: 'Child not found in linked children' });
      }
      targetChildId = match.id;
    }

    const creds = db.prepare('SELECT id FROM webtop_credentials ORDER BY updated_at DESC LIMIT 1').get();
    if (creds) {
      db.prepare(`
        UPDATE webtop_credentials
        SET selected_child_id = ?, updated_at = ?
        WHERE id = ?
      `).run(targetChildId, new Date().toISOString(), creds.id);
    }

    res.json({ success: true, selectedChildId: targetChildId });
  } catch (err) {
    console.error('Failed to switch child:', err);
    res.status(500).json({ error: 'Failed to switch child' });
  }
});

// PATCH /api/webtop/child-color - set badge color for a linked child (parent only)
app.patch('/api/webtop/child-color', authenticate, requireParent, (req, res) => {
  try {
    const { childId, color } = req.body;
    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }

    if (color !== undefined && color !== null && color !== '') {
      if (typeof color !== 'string' || color.trim().length > 32 || !/^[a-zA-Z0-9#-]+$/.test(color.trim())) {
        return res.status(400).json({ error: 'Invalid color format' });
      }
    }

    const cleanColor = typeof color === 'string' && color.trim() ? color.trim() : null;
    const now = new Date().toISOString();

    const result = db.prepare(`
      UPDATE children
      SET color = ?, updated_at = ?
      WHERE (id = ? OR external_id = ?)
    `).run(cleanColor, now, childId, childId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Child not found in linked children' });
    }

    const linkedChildren = db.prepare(`
      SELECT id, first_name as firstName, last_name as lastName, class_code as classCode, class_num as classNum, cellphone, color, external_id as externalId
      FROM children
      WHERE external_source = 'webtop'
      ORDER BY class_code ASC, first_name ASC
    `).all();

    res.json({ success: true, linkedChildren });
  } catch (err) {
    console.error('Failed to update child color:', err);
    res.status(500).json({ error: 'Failed to update child color' });
  }
});

// POST /api/webtop/sync - trigger manual sync (available to all family members)
app.post('/api/webtop/sync', authenticate, async (req, res) => {
  try {
    const creds = db.prepare('SELECT id FROM webtop_credentials ORDER BY updated_at DESC LIMIT 1').get();
    if (!creds) {
      return res.status(400).json({ error: 'Webtop credentials not configured' });
    }

    const result = await runWebtopSync();
    res.json({ success: true, result });
  } catch (err) {
    logWebtopFailure('Failed to sync Webtop data', err);
    // Persist error status
    const creds = db.prepare('SELECT id FROM webtop_credentials ORDER BY updated_at DESC LIMIT 1').get();
    if (creds) {
      db.prepare(`
        UPDATE webtop_credentials
        SET sync_status = 'error', sync_error = ?, updated_at = ?
        WHERE id = ?
      `).run(err.message || 'Sync failed', new Date().toISOString(), creds.id);
    }

    res.status(500).json({ error: err.message || 'Failed to sync Webtop data' });
  }
});

// POST /api/webtop/sync-if-stale - sync on app open if data is older than the minimum gap
// (production only; returns { skipped: true, reason } everywhere else)
app.post('/api/webtop/sync-if-stale', authenticate, async (req, res) => {
  try {
    const outcome = await autoSync.syncIfStale();
    res.json({ success: true, ...outcome });
  } catch (err) {
    logWebtopFailure('Failed to sync Webtop data on app open', err);
    res.status(500).json({ error: err.message || 'Failed to sync Webtop data' });
  }
});

// PUT /api/webtop/auto-sync - enable/disable automatic sync, or resume after a pause (parent only)
app.put('/api/webtop/auto-sync', authenticate, requireParent, (req, res) => {
  const { enabled } = req.body || {};
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled must be a boolean' });
  }
  if (!autoSync.getStatus().autoSyncAvailable) {
    return res.status(403).json({ error: 'Automatic sync is not available in this environment' });
  }
  if (!autoSync.setEnabled(enabled)) {
    return res.status(400).json({ error: 'Webtop credentials not configured' });
  }
  res.json({ success: true, ...autoSync.getStatus() });
});

// DELETE /api/webtop/config - remove credentials and clear synced data (parent only)
app.delete('/api/webtop/config', authenticate, requireParent, (req, res) => {
  try {
    const deleteTx = db.transaction(() => {
      db.prepare('DELETE FROM webtop_credentials').run();
      clearWebtopSession();
      db.prepare('DELETE FROM incidents').run();
      db.prepare('DELETE FROM homework').run();
      db.prepare("DELETE FROM children WHERE external_source = 'webtop'").run();
    });
    deleteTx();
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete Webtop config:', err);
    res.status(500).json({ error: 'Failed to remove Webtop configuration' });
  }
});

// GET /api/incidents
app.get('/api/incidents', authenticate, (req, res) => {
  try {
    const { childId } = req.query;

    if (req.user.familyRole === 'child') {
      if (!req.user.linkedChildId) {
        return res.json({ incidents: [] });
      }
      const incidents = db.prepare(`
        SELECT id, child_id as childId, student_id as studentId, student_name as studentName, date, type, subject, teacher, description, hour_num as hourNum, is_justified as isJustified, event_code as eventCode, raw_data as rawData, created_at as createdAt
        FROM incidents
        WHERE (child_id = ? OR student_id = ?)
        ORDER BY date DESC, hour_num ASC
      `).all(req.user.linkedChildId, req.user.linkedChildId);
      return res.json({ incidents });
    }

    let query = `
      SELECT id, child_id as childId, student_id as studentId, student_name as studentName, date, type, subject, teacher, description, hour_num as hourNum, is_justified as isJustified, event_code as eventCode, raw_data as rawData, created_at as createdAt
      FROM incidents
    `;
    const params = [];

    if (childId && childId !== 'all') {
      query += ` WHERE (child_id = ? OR student_id = ?)`;
      params.push(childId, childId);
    }

    query += ` ORDER BY date DESC, hour_num ASC`;
    const incidents = db.prepare(query).all(...params);

    res.json({ incidents });
  } catch (err) {
    console.error('Failed to fetch incidents:', err);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

// GET /api/homework
app.get('/api/homework', authenticate, (req, res) => {
  try {
    const { childId } = req.query;

    if (req.user.familyRole === 'child') {
      if (!req.user.linkedChildId) {
        return res.json({ homework: [] });
      }
      const homework = db.prepare(`
        SELECT id, child_id as childId, student_id as studentId, student_name as studentName, subject, teacher, due_date as dueDate, description, lesson_subject as lessonSubject, hour_num as hourNum, completed, raw_data as rawData, created_at as createdAt
        FROM homework
        WHERE (child_id = ? OR student_id = ?)
        ORDER BY due_date DESC, hour_num ASC
      `).all(req.user.linkedChildId, req.user.linkedChildId);
      return res.json({ homework: homework.map(h => ({ ...h, completed: Boolean(h.completed) })) });
    }

    let query = `
      SELECT id, child_id as childId, student_id as studentId, student_name as studentName, subject, teacher, due_date as dueDate, description, lesson_subject as lessonSubject, hour_num as hourNum, completed, raw_data as rawData, created_at as createdAt
      FROM homework
    `;
    const params = [];

    if (childId && childId !== 'all') {
      query += ` WHERE (child_id = ? OR student_id = ?)`;
      params.push(childId, childId);
    }

    query += ` ORDER BY due_date DESC, hour_num ASC`;
    const homework = db.prepare(query).all(...params);

    res.json({ homework: homework.map(h => ({ ...h, completed: Boolean(h.completed) })) });
  } catch (err) {
    console.error('Failed to fetch homework:', err);
    res.status(500).json({ error: 'Failed to fetch homework' });
  }
});

// PATCH /api/homework/:id/toggle
app.patch('/api/homework/:id/toggle', authenticate, (req, res) => {
  try {
    const item = db.prepare('SELECT id, child_id, student_id, completed FROM homework WHERE id = ?').get(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Homework item not found' });
    }

    if (req.user.familyRole === 'child') {
      if (!req.user.linkedChildId || (item.child_id !== req.user.linkedChildId && item.student_id !== req.user.linkedChildId)) {
        return res.status(403).json({ error: 'Forbidden: Cannot toggle another student\'s homework' });
      }
    }

    const newCompleted = item.completed ? 0 : 1;
    db.prepare('UPDATE homework SET completed = ? WHERE id = ?').run(newCompleted, req.params.id);

    res.json({ success: true, completed: Boolean(newCompleted) });
  } catch (err) {
    console.error('Failed to toggle homework:', err);
    res.status(500).json({ error: 'Failed to toggle homework' });
  }
});

/* --- Exams Endpoints --- */

// Helper to validate real calendar dates (YYYY-MM-DD)
function isValidCalendarDate(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  if (year < 2000 || year > 2099) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

// GET /api/exams
app.get('/api/exams', authenticate, (req, res) => {
  try {
    const rawChildId = req.query.childId;
    const cleanChildId = typeof rawChildId === 'string' ? rawChildId.trim() : null;

    if (req.user.familyRole === 'child') {
      if (!req.user.linkedChildId) {
        return res.json({ exams: [] });
      }
      const exams = db.prepare(`
        SELECT id, child_id as childId, student_name as studentName, name, coalesce(description, '') as description, date, grade, created_at as createdAt, updated_at as updatedAt
        FROM exams
        WHERE (child_id = ? OR child_id IN (SELECT id FROM children WHERE external_id = ?))
        ORDER BY date ASC
      `).all(req.user.linkedChildId, req.user.linkedChildId);
      return res.json({ exams });
    }

    let query = `
      SELECT id, child_id as childId, student_name as studentName, name, coalesce(description, '') as description, date, grade, created_at as createdAt, updated_at as updatedAt
      FROM exams
    `;
    const params = [];

    if (cleanChildId && cleanChildId !== 'all') {
      query += ` WHERE (child_id = ? OR child_id IN (SELECT id FROM children WHERE external_id = ?))`;
      params.push(cleanChildId, cleanChildId);
    }

    query += ` ORDER BY date ASC`;
    const exams = db.prepare(query).all(...params);

    res.json({ exams });
  } catch (err) {
    console.error('Failed to fetch exams:', err);
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

// POST /api/exams
app.post('/api/exams', authenticate, requireParent, (req, res) => {
  try {
    const { childId, name, description, date, grade } = req.body;

    if (!childId || typeof childId !== 'string') {
      return res.status(400).json({ error: 'child_required', message: 'Student selection is required' });
    }

    const cleanName = typeof name === 'string' ? name.trim() : '';
    if (!cleanName || cleanName.length > 120) {
      return res.status(400).json({ error: 'name_invalid', message: 'Exam name is required (max 120 characters)' });
    }

    const cleanDescription = typeof description === 'string' ? description.trim().slice(0, 200) : '';

    const cleanDate = typeof date === 'string' ? date.trim() : '';
    if (!isValidCalendarDate(cleanDate)) {
      return res.status(400).json({ error: 'date_invalid', message: 'Valid date (YYYY-MM-DD) is required' });
    }

    const cleanGrade = (typeof grade === 'string' || typeof grade === 'number')
      ? String(grade).trim().slice(0, 32)
      : '';

    const child = db.prepare(`
      SELECT id, first_name, last_name FROM children
      WHERE (id = ? OR external_id = ?)
    `).get(childId.trim(), childId.trim());

    if (!child) {
      return res.status(400).json({ error: 'child_not_found', message: 'Selected student not found' });
    }

    const studentName = `${child.first_name || ''} ${child.last_name || ''}`.trim() || 'Student';
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO exams (id, user_id, child_id, student_name, name, description, date, grade, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, child.id, studentName, cleanName, cleanDescription, cleanDate, cleanGrade, now, now);

    res.status(201).json({
      exam: {
        id,
        childId: child.id,
        studentName,
        name: cleanName,
        description: cleanDescription,
        date: cleanDate,
        grade: cleanGrade,
        createdAt: now,
        updatedAt: now
      }
    });
  } catch (err) {
    console.error('Failed to create exam:', err);
    res.status(500).json({ error: 'create_failed', message: 'Failed to create exam' });
  }
});

// PUT /api/exams/:id
app.put('/api/exams/:id', authenticate, requireParent, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'not_found', message: 'Exam not found' });
    }

    const { childId, name, description, date, grade } = req.body;

    let targetChildId = existing.child_id;
    let targetStudentName = existing.student_name;

    if (childId !== undefined) {
      if (!childId || typeof childId !== 'string') {
        return res.status(400).json({ error: 'child_required', message: 'Student selection is required' });
      }
      const child = db.prepare(`
        SELECT id, first_name, last_name FROM children
        WHERE (id = ? OR external_id = ?)
      `).get(childId.trim(), childId.trim());

      if (!child) {
        return res.status(400).json({ error: 'child_not_found', message: 'Selected student not found' });
      }
      targetChildId = child.id;
      targetStudentName = `${child.first_name || ''} ${child.last_name || ''}`.trim() || 'Student';
    }

    let targetName = existing.name;
    if (name !== undefined) {
      const cleanName = typeof name === 'string' ? name.trim() : '';
      if (!cleanName || cleanName.length > 120) {
        return res.status(400).json({ error: 'name_invalid', message: 'Exam name is required (max 120 characters)' });
      }
      targetName = cleanName;
    }

    let targetDescription = existing.description || '';
    if (description !== undefined) {
      targetDescription = typeof description === 'string' ? description.trim().slice(0, 200) : '';
    }

    let targetDate = existing.date;
    if (date !== undefined) {
      const cleanDate = typeof date === 'string' ? date.trim() : '';
      if (!isValidCalendarDate(cleanDate)) {
        return res.status(400).json({ error: 'date_invalid', message: 'Valid date (YYYY-MM-DD) is required' });
      }
      targetDate = cleanDate;
    }

    let targetGrade = existing.grade || '';
    if (grade !== undefined) {
      targetGrade = (typeof grade === 'string' || typeof grade === 'number')
        ? String(grade).trim().slice(0, 32)
        : '';
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE exams
      SET child_id = ?, student_name = ?, name = ?, description = ?, date = ?, grade = ?, updated_at = ?
      WHERE id = ?
    `).run(targetChildId, targetStudentName, targetName, targetDescription, targetDate, targetGrade, now, req.params.id);

    res.json({
      exam: {
        id: req.params.id,
        childId: targetChildId,
        studentName: targetStudentName,
        name: targetName,
        description: targetDescription,
        date: targetDate,
        grade: targetGrade,
        createdAt: existing.created_at,
        updatedAt: now
      }
    });
  } catch (err) {
    console.error('Failed to update exam:', err);
    res.status(500).json({ error: 'update_failed', message: 'Failed to update exam' });
  }
});

// DELETE /api/exams/:id
app.delete('/api/exams/:id', authenticate, requireParent, (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM exams WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'not_found', message: 'Exam not found' });
    }

    db.prepare('DELETE FROM exams WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete exam:', err);
    res.status(500).json({ error: 'delete_failed', message: 'Failed to delete exam' });
  }
});

/* --- Weekly Schedule Endpoints --- */

// GET /api/schedule
app.get('/api/schedule', authenticate, (req, res) => {
  try {
    const rawChildId = req.query.childId;
    const cleanChildId = typeof rawChildId === 'string' ? rawChildId.trim() : null;

    let targetChildId = cleanChildId;
    if (req.user.familyRole === 'child') {
      if (!req.user.linkedChildId) {
        return res.json({ lessons: [], finishTimes: [] });
      }
      targetChildId = req.user.linkedChildId;
    }

    if (!targetChildId || targetChildId === 'all') {
      // Find default child if available
      const firstChild = db.prepare('SELECT id FROM children ORDER BY class_code ASC, first_name ASC LIMIT 1').get();
      if (!firstChild) {
        return res.json({ lessons: [], finishTimes: [] });
      }
      targetChildId = firstChild.id;
    }

    const lessons = db.prepare(`
      SELECT id, child_id as childId, day_of_week as dayOfWeek, hour_num as hourNum, subject, coalesce(teacher, '') as teacher, coalesce(room, '') as room, updated_at as updatedAt
      FROM schedule_lessons
      WHERE (child_id = ? OR child_id IN (SELECT id FROM children WHERE external_id = ?))
      ORDER BY day_of_week ASC, hour_num ASC
    `).all(targetChildId, targetChildId);

    const finishTimes = db.prepare(`
      SELECT id, child_id as childId, day_of_week as dayOfWeek, finish_time as finishTime, updated_at as updatedAt
      FROM schedule_day_settings
      WHERE (child_id = ? OR child_id IN (SELECT id FROM children WHERE external_id = ?))
      ORDER BY day_of_week ASC
    `).all(targetChildId, targetChildId);

    res.json({ lessons, finishTimes });
  } catch (err) {
    console.error('Failed to fetch schedule:', err);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// PUT /api/schedule/lesson
app.put('/api/schedule/lesson', authenticate, requireParent, (req, res) => {
  try {
    const { childId, dayOfWeek, hourNum, subject, teacher, room } = req.body;

    if (!childId || typeof childId !== 'string') {
      return res.status(400).json({ error: 'child_required', message: 'Student selection is required' });
    }

    const parsedDay = parseInt(dayOfWeek, 10);
    if (isNaN(parsedDay) || parsedDay < 0 || parsedDay > 5) {
      return res.status(400).json({ error: 'day_invalid', message: 'Day of week must be between 0 (Sunday) and 5 (Friday)' });
    }

    const parsedHour = parseInt(hourNum, 10);
    if (isNaN(parsedHour) || parsedHour < 1 || parsedHour > 12) {
      return res.status(400).json({ error: 'hour_invalid', message: 'Hour number must be between 1 and 12' });
    }

    const child = db.prepare(`
      SELECT id FROM children
      WHERE (id = ? OR external_id = ?)
    `).get(childId.trim(), childId.trim());

    if (!child) {
      return res.status(400).json({ error: 'child_not_found', message: 'Selected student not found' });
    }

    if (typeof subject === 'string' && subject.trim().length > 50) {
      return res.status(400).json({ error: 'subject_too_long', message: 'Lesson subject cannot exceed 50 characters' });
    }

    const cleanSubject = typeof subject === 'string' ? subject.trim().slice(0, 50) : '';
    const cleanTeacher = typeof teacher === 'string' ? teacher.trim().slice(0, 120) : '';
    const cleanRoom = typeof room === 'string' ? room.trim().slice(0, 60) : '';

    if (!cleanSubject) {
      // Clear/delete the lesson slot
      db.prepare(`
        DELETE FROM schedule_lessons
        WHERE child_id = ? AND day_of_week = ? AND hour_num = ?
      `).run(child.id, parsedDay, parsedHour);

      return res.json({ deleted: true, dayOfWeek: parsedDay, hourNum: parsedHour });
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO schedule_lessons (id, user_id, child_id, day_of_week, hour_num, subject, teacher, room, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(child_id, day_of_week, hour_num) DO UPDATE SET
        subject = excluded.subject,
        teacher = excluded.teacher,
        room = excluded.room,
        updated_at = excluded.updated_at
    `).run(id, child.id, parsedDay, parsedHour, cleanSubject, cleanTeacher, cleanRoom, now, now);

    const saved = db.prepare(`
      SELECT id, child_id as childId, day_of_week as dayOfWeek, hour_num as hourNum, subject, teacher, room, updated_at as updatedAt
      FROM schedule_lessons
      WHERE child_id = ? AND day_of_week = ? AND hour_num = ?
    `).get(child.id, parsedDay, parsedHour);

    res.json({ lesson: saved });
  } catch (err) {
    console.error('Failed to update schedule lesson:', err);
    res.status(500).json({ error: 'update_failed', message: 'Failed to update schedule lesson' });
  }
});

// PUT /api/schedule/finish-time
app.put('/api/schedule/finish-time', authenticate, requireParent, (req, res) => {
  try {
    const { childId, dayOfWeek, finishTime } = req.body;

    if (!childId || typeof childId !== 'string') {
      return res.status(400).json({ error: 'child_required', message: 'Student selection is required' });
    }

    const parsedDay = parseInt(dayOfWeek, 10);
    if (isNaN(parsedDay) || parsedDay < 0 || parsedDay > 5) {
      return res.status(400).json({ error: 'day_invalid', message: 'Day of week must be between 0 (Sunday) and 5 (Friday)' });
    }

    const child = db.prepare(`
      SELECT id FROM children
      WHERE (id = ? OR external_id = ?)
    `).get(childId.trim(), childId.trim());

    if (!child) {
      return res.status(400).json({ error: 'child_not_found', message: 'Selected student not found' });
    }

    const cleanTime = typeof finishTime === 'string' ? finishTime.trim() : '';

    if (!cleanTime) {
      // Clear finish time for this day
      db.prepare(`
        DELETE FROM schedule_day_settings
        WHERE child_id = ? AND day_of_week = ?
      `).run(child.id, parsedDay);

      return res.json({ deleted: true, dayOfWeek: parsedDay });
    }

    // Validate 24-hour time format: HH:mm
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(cleanTime)) {
      return res.status(400).json({ error: 'invalid_time_format', message: 'Finish time must be in HH:mm format' });
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO schedule_day_settings (id, user_id, child_id, day_of_week, finish_time, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?)
      ON CONFLICT(child_id, day_of_week) DO UPDATE SET
        finish_time = excluded.finish_time,
        updated_at = excluded.updated_at
    `).run(id, child.id, parsedDay, cleanTime, now, now);

    const saved = db.prepare(`
      SELECT id, child_id as childId, day_of_week as dayOfWeek, finish_time as finishTime, updated_at as updatedAt
      FROM schedule_day_settings
      WHERE child_id = ? AND day_of_week = ?
    `).get(child.id, parsedDay);

    res.json({ finishTime: saved });
  } catch (err) {
    console.error('Failed to update finish time:', err);
    res.status(500).json({ error: 'update_failed', message: 'Failed to update finish time' });
  }
});

// PUT /api/schedule/batch - Save all lessons and finish times for a child in one transaction
app.put('/api/schedule/batch', authenticate, requireParent, (req, res) => {
  try {
    const { childId, lessons, finishTimes } = req.body;

    if (!childId || typeof childId !== 'string') {
      return res.status(400).json({ error: 'child_required', message: 'Student selection is required' });
    }

    const child = db.prepare('SELECT id FROM children WHERE id = ? OR external_id = ?').get(childId.trim(), childId.trim());
    if (!child) {
      return res.status(404).json({ error: 'child_not_found', message: 'Selected child does not exist' });
    }

    if (!Array.isArray(lessons) || !Array.isArray(finishTimes)) {
      return res.status(400).json({ error: 'invalid_payload', message: 'lessons and finishTimes must be arrays' });
    }

    if (lessons.length > 72 || finishTimes.length > 6) {
      return res.status(400).json({ error: 'payload_too_large', message: 'Exceeded maximum allowable lessons (72) or finish times (6)' });
    }

    const now = new Date().toISOString();

    const saveBatch = db.transaction(() => {
      // Clear existing schedule records for this child
      db.prepare('DELETE FROM schedule_lessons WHERE child_id = ?').run(child.id);
      db.prepare('DELETE FROM schedule_day_settings WHERE child_id = ?').run(child.id);

      const insertLesson = db.prepare(`
        INSERT INTO schedule_lessons (id, user_id, child_id, day_of_week, hour_num, subject, teacher, room, created_at, updated_at)
        VALUES (?, 'family', ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const seenSlots = new Set();
      for (const l of lessons) {
        if (!l || typeof l !== 'object') continue;
        const parsedDay = parseInt(l.dayOfWeek, 10);
        const parsedHour = parseInt(l.hourNum, 10);
        const cleanSubject = typeof l.subject === 'string' ? l.subject.trim().slice(0, 50) : '';

        if (isNaN(parsedDay) || parsedDay < 0 || parsedDay > 5) continue;
        if (isNaN(parsedHour) || parsedHour < 1 || parsedHour > 12) continue;
        if (!cleanSubject) continue;

        const slotKey = `${parsedDay}-${parsedHour}`;
        if (seenSlots.has(slotKey)) continue;
        seenSlots.add(slotKey);

        insertLesson.run(crypto.randomUUID(), child.id, parsedDay, parsedHour, cleanSubject, '', '', now, now);
      }

      const insertFinish = db.prepare(`
        INSERT INTO schedule_day_settings (id, user_id, child_id, day_of_week, finish_time, created_at, updated_at)
        VALUES (?, 'family', ?, ?, ?, ?, ?)
      `);

      const seenDays = new Set();
      for (const f of finishTimes) {
        if (!f || typeof f !== 'object') continue;
        const parsedDay = parseInt(f.dayOfWeek, 10);
        const cleanTime = typeof f.finishTime === 'string' ? f.finishTime.trim() : '';

        if (isNaN(parsedDay) || parsedDay < 0 || parsedDay > 5) continue;
        if (!cleanTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(cleanTime)) continue;

        if (seenDays.has(parsedDay)) continue;
        seenDays.add(parsedDay);

        insertFinish.run(crypto.randomUUID(), child.id, parsedDay, cleanTime, now, now);
      }
    });

    saveBatch();

    const updatedLessons = db.prepare(`
      SELECT id, child_id as childId, day_of_week as dayOfWeek, hour_num as hourNum, subject, coalesce(teacher, '') as teacher, coalesce(room, '') as room, updated_at as updatedAt
      FROM schedule_lessons
      WHERE child_id = ?
      ORDER BY day_of_week ASC, hour_num ASC
    `).all(child.id);

    const updatedFinishTimes = db.prepare(`
      SELECT id, child_id as childId, day_of_week as dayOfWeek, finish_time as finishTime, updated_at as updatedAt
      FROM schedule_day_settings
      WHERE child_id = ?
      ORDER BY day_of_week ASC
    `).all(child.id);

    res.json({ success: true, lessons: updatedLessons, finishTimes: updatedFinishTimes });
  } catch (err) {
    console.error('Failed to update schedule batch:', err);
    res.status(500).json({ error: 'update_failed', message: 'Failed to update schedule batch' });
  }
});
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

// SPA fallback rate limiter to protect against file system DoS (CodeQL js/missing-rate-limiting)
const spaRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: process.env.NODE_ENV === 'test' ? 10000 : 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: 'Too many requests, please try again later.'
});

// SPA fallback
app.get(/.*/, spaRateLimiter, (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`School server running on http://localhost:${PORT}`);
  autoSync.start();
});

export default app;

