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
import { WebtopClient, encryptPassword, decryptPassword, getWebtopStudyYear, setEncryptionSecret } from './webtop.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
if (process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}
const PORT = process.env.PORT || 3001;

// In-memory rate limiting map: key -> { count, resetAt }
const authRateLimits = new Map();
function rateLimitAuth(maxAttempts = (process.env.NODE_ENV === 'test' ? 1000 : 60), windowMs = 60 * 1000) {
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const userPart = req.body?.username ? `:${String(req.body.username).toLowerCase().trim()}` : '';
    const key = `${ip}${userPart}`;
    const now = Date.now();
    const record = authRateLimits.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }

    record.count++;
    authRateLimits.set(key, record);

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
  for (const [key, rec] of authRateLimits.entries()) {
    if (rec.resetAt < now) {
      authRateLimits.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

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

function getWebAuthnConfig(req) {
  const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://localhost:3001',
    'http://localhost:8080',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:8080',
  ]);

  if (process.env.EXPECTED_ORIGIN) {
    process.env.EXPECTED_ORIGIN.split(',').forEach(o => {
      const trimmed = o.trim();
      if (trimmed) allowedOrigins.add(trimmed);
    });
  }

  const hostHeader = req.get('host') || 'localhost:3001';
  const serverHostname = hostHeader.split(':')[0];
  const serverOrigin = `${req.protocol}://${hostHeader}`;

  // Allow server origin if on loopback
  if (['localhost', '127.0.0.1'].includes(serverHostname)) {
    allowedOrigins.add(serverOrigin);
  }

  let rpID = process.env.RP_ID;
  if (!rpID) {
    if (['localhost', '127.0.0.1'].includes(serverHostname)) {
      rpID = serverHostname;
    } else if (process.env.EXPECTED_ORIGIN) {
      try {
        const firstOrigin = process.env.EXPECTED_ORIGIN.split(',')[0].trim();
        rpID = new URL(firstOrigin).hostname;
      } catch {
        rpID = 'localhost';
      }
    } else {
      rpID = 'localhost';
    }
  }

  return { rpID, expectedOrigin: Array.from(allowedOrigins), rpName: 'School' };
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
    const user = db.prepare('SELECT id, username, role, first_name, last_name, token_version FROM users WHERE id = ?').get(payload.id);
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

async function syncWebtopData(userId) {
  const creds = db.prepare('SELECT * FROM webtop_credentials WHERE user_id = ?').get(userId);
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

  const client = new WebtopClient();
  await client.login(creds.username, plainPassword);

  const dash = await client.initDashboard();
  const rawChildren = dash.childrens || [];
  const existingLinked = JSON.parse(creds.linked_children || '[]');
  const colorMap = new Map(existingLinked.map(c => [c.id, c.color]));

  const linkedChildren = rawChildren.map(c => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    classCode: c.classCode,
    classNum: c.classNum,
    cellphone: c.cellphone || null,
    color: colorMap.get(c.id) || null
  }));

  let selectedChildId = creds.selected_child_id;
  if (!selectedChildId || !linkedChildren.some(c => c.id === selectedChildId)) {
    selectedChildId = linkedChildren[0]?.id || null;
  }

  // Update credentials row with fresh children list & syncing status
  db.prepare(`
    UPDATE webtop_credentials
    SET linked_children = ?, selected_child_id = ?, sync_status = 'syncing', updated_at = ?
    WHERE user_id = ?
  `).run(JSON.stringify(linkedChildren), selectedChildId, new Date().toISOString(), userId);

  const allIncidents = [];
  const allHomework = [];

  for (const child of linkedChildren) {
    const childFullName = `${child.firstName} ${child.lastName}`.trim();
    const sanitizedChild = childFullName.replace(/[^\w\u0590-\u05fe]/g, '_');

    // 1. Incidents
    try {
      const incidents = await client.getIncidents(child.id, child.classCode);
      for (const ev of incidents) {
        allIncidents.push({
          id: `webtop-inc-${userId}-${ev.eventID || crypto.randomUUID()}`,
          userId,
          studentId: child.id,
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
      console.warn(`Failed to fetch incidents for child ${child.id}:`, e.message);
    }

    // 2. Homework & Weekly Lessons across past weeks (current week + last 3 weeks)
    try {
      const studyYear = getWebtopStudyYear();
      const weeksToFetch = [0, -1, -2, -3];

      for (const weekOffset of weeksToFetch) {
        try {
          const days = await client.getWeeklyLessonsAndHomework(child.id, child.classCode, studyYear, weekOffset);
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
                const hwId = `webtop-hw-${userId}-${sanitizedChild}-${dayDate}-${hourNum !== null && !isNaN(hourNum) ? hourNum : '0'}-${sanitizedSubject}`;

                allHomework.push({
                  id: hwId,
                  userId,
                  studentId: child.id,
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
          console.warn(`Failed to fetch weekly lessons/homework for child ${child.id} (week ${weekOffset}):`, weekErr.message);
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch weekly homework for child ${child.id}:`, e.message);
    }

    // Fallback/supplemental: fetch today's dashboard homework
    try {
      const hwLessons = await client.getHomework(child.id, child.classCode, child.classNum);
      const today = new Date().toISOString().split('T')[0];
      for (const item of hwLessons) {
        const desc = item.homeworkData || item.lessonSubject || '';
        if (!desc.trim()) continue;
        const hourNum = item.hourNum ? parseInt(item.hourNum, 10) : null;
        const subject = (item.lesson || '').trim();
        const sanitizedSubject = subject.replace(/[^\w\u0590-\u05fe]/g, '_');
        const hwId = `webtop-hw-${userId}-${sanitizedChild}-${today}-${hourNum !== null && !isNaN(hourNum) ? hourNum : '0'}-${sanitizedSubject}`;

        allHomework.push({
          id: hwId,
          userId,
          studentId: child.id,
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
      console.warn(`Failed to fetch dashboard homework for child ${child.id}:`, e.message);
    }
  }

  // Deduplicate homework by ID
  const uniqueHomeworkMap = new Map();
  for (const hw of allHomework) {
    uniqueHomeworkMap.set(hw.id, hw);
  }
  const dedupedHomework = Array.from(uniqueHomeworkMap.values());

  // Atomically update DB records for this user
  const syncTx = db.transaction(() => {
    // Upsert incidents
    const upsertIncident = db.prepare(`
      INSERT INTO incidents (id, user_id, student_id, student_name, date, type, subject, teacher, description, hour_num, is_justified, event_code, raw_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
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
        inc.id, inc.userId, inc.studentId, inc.studentName, inc.date, inc.type,
        inc.subject, inc.teacher, inc.description, inc.hourNum, inc.isJustified,
        inc.eventCode, inc.rawData, new Date().toISOString()
      );
    }

    // Upsert homework
    const upsertHw = db.prepare(`
      INSERT INTO homework (id, user_id, student_id, student_name, subject, teacher, due_date, description, lesson_subject, hour_num, raw_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
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
        hw.id, hw.userId, hw.studentId, hw.studentName, hw.subject,
        hw.teacher, hw.dueDate, hw.description, hw.lessonSubject, hw.hourNum,
        hw.rawData, new Date().toISOString()
      );
    }

    // Mark sync success
    db.prepare(`
      UPDATE webtop_credentials
      SET last_synced_at = ?, sync_status = 'success', sync_error = null, updated_at = ?
      WHERE user_id = ?
    `).run(new Date().toISOString(), new Date().toISOString(), userId);
  });

  syncTx();

  return {
    childrenCount: linkedChildren.length,
    incidentsCount: allIncidents.length,
    homeworkCount: allHomework.length
  };
}

// GET /api/webtop/config
app.get('/api/webtop/config', authenticate, (req, res) => {
  try {
    const creds = db.prepare(`
      SELECT username, selected_child_id, linked_children, last_synced_at, sync_status, sync_error
      FROM webtop_credentials
      WHERE user_id = ?
    `).get(req.user.id);

    if (!creds) {
      return res.json({
        configured: false,
        username: null,
        selectedChildId: null,
        linkedChildren: [],
        lastSyncedAt: null,
        syncStatus: 'idle',
        syncError: null
      });
    }

    let linkedChildren = [];
    try {
      linkedChildren = JSON.parse(creds.linked_children || '[]');
    } catch {
      linkedChildren = [];
    }

    res.json({
      configured: true,
      username: creds.username,
      selectedChildId: creds.selected_child_id,
      linkedChildren,
      lastSyncedAt: creds.last_synced_at,
      syncStatus: creds.sync_status,
      syncError: creds.sync_error
    });
  } catch (err) {
    console.error('Failed to fetch Webtop config:', err);
    res.status(500).json({ error: 'Failed to fetch Webtop configuration' });
  }
});

// POST /api/webtop/test - verify credentials live without persisting
app.post('/api/webtop/test', authenticate, async (req, res) => {
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
      id: c.id,
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
    console.error('Webtop test login failed:', err.message);
    res.status(400).json({ error: err.message || 'Webtop authentication failed' });
  }
});

// POST /api/webtop/config - save credentials & run initial sync
app.post('/api/webtop/config', authenticate, async (req, res) => {
  try {
    const { username, password, selectedChildId } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const client = new WebtopClient();
    await client.login(username, password);
    const dash = await client.initDashboard();
    const rawChildren = dash.childrens || [];
    const linkedChildren = rawChildren.map(c => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      classCode: c.classCode,
      classNum: c.classNum,
      cellphone: c.cellphone || null
    }));

    let effectiveChildId = selectedChildId;
    if (!effectiveChildId || !linkedChildren.some(c => c.id === effectiveChildId)) {
      effectiveChildId = linkedChildren[0]?.id || null;
    }

    const encryptedPass = encryptPassword(password);
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT id, linked_children FROM webtop_credentials WHERE user_id = ?').get(req.user.id);
    if (existing) {
      const prevLinked = JSON.parse(existing.linked_children || '[]');
      const colorMap = new Map(prevLinked.map(c => [c.id, c.color]));
      for (const c of linkedChildren) {
        if (colorMap.has(c.id)) c.color = colorMap.get(c.id);
      }

      db.prepare(`
        UPDATE webtop_credentials
        SET username = ?, encrypted_password = ?, selected_child_id = ?, linked_children = ?, updated_at = ?
        WHERE user_id = ?
      `).run(username, encryptedPass, effectiveChildId, JSON.stringify(linkedChildren), now, req.user.id);
    } else {
      db.prepare(`
        INSERT INTO webtop_credentials (id, user_id, username, encrypted_password, selected_child_id, linked_children, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), req.user.id, username, encryptedPass, effectiveChildId, JSON.stringify(linkedChildren), now, now);
    }

    let syncResult = null;
    try {
      syncResult = await syncWebtopData(req.user.id);
    } catch (syncErr) {
      console.warn('Initial sync warning:', syncErr.message);
    }

    res.json({
      success: true,
      username,
      selectedChildId: effectiveChildId,
      linkedChildren,
      syncResult
    });
  } catch (err) {
    console.error('Failed to configure Webtop:', err);
    res.status(400).json({ error: err.message || 'Failed to configure Webtop' });
  }
});

// PATCH /api/webtop/child - switch active child
app.patch('/api/webtop/child', authenticate, (req, res) => {
  try {
    const { childId } = req.body;
    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }
    const creds = db.prepare('SELECT linked_children FROM webtop_credentials WHERE user_id = ?').get(req.user.id);
    if (!creds) {
      return res.status(404).json({ error: 'Webtop credentials not configured' });
    }

    const linked = JSON.parse(creds.linked_children || '[]');
    if (childId !== 'all' && !linked.some(c => c.id === childId)) {
      return res.status(400).json({ error: 'Child not found in linked children' });
    }

    db.prepare(`
      UPDATE webtop_credentials
      SET selected_child_id = ?, updated_at = ?
      WHERE user_id = ?
    `).run(childId, new Date().toISOString(), req.user.id);

    res.json({ success: true, selectedChildId: childId });
  } catch (err) {
    console.error('Failed to switch child:', err);
    res.status(500).json({ error: 'Failed to switch child' });
  }
});

// PATCH /api/webtop/child-color - set badge color for a linked child
app.patch('/api/webtop/child-color', authenticate, (req, res) => {
  try {
    const { childId, color } = req.body;
    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }

    const creds = db.prepare('SELECT linked_children FROM webtop_credentials WHERE user_id = ?').get(req.user.id);
    if (!creds) {
      return res.status(404).json({ error: 'Webtop credentials not configured' });
    }

    const linked = JSON.parse(creds.linked_children || '[]');
    const childIndex = linked.findIndex(c => c.id === childId);
    if (childIndex === -1) {
      return res.status(404).json({ error: 'Child not found in linked children' });
    }

    linked[childIndex].color = typeof color === 'string' && color.trim() ? color.trim() : null;

    db.prepare(`
      UPDATE webtop_credentials
      SET linked_children = ?, updated_at = ?
      WHERE user_id = ?
    `).run(JSON.stringify(linked), new Date().toISOString(), req.user.id);

    res.json({ success: true, linkedChildren: linked });
  } catch (err) {
    console.error('Failed to update child color:', err);
    res.status(500).json({ error: 'Failed to update child color' });
  }
});

// POST /api/webtop/sync - trigger manual sync
app.post('/api/webtop/sync', authenticate, async (req, res) => {
  try {
    const creds = db.prepare('SELECT id FROM webtop_credentials WHERE user_id = ?').get(req.user.id);
    if (!creds) {
      return res.status(400).json({ error: 'Webtop credentials not configured' });
    }

    const result = await syncWebtopData(req.user.id);
    res.json({ success: true, result });
  } catch (err) {
    console.error('Failed to sync Webtop data:', err);
    // Persist error status
    db.prepare(`
      UPDATE webtop_credentials
      SET sync_status = 'error', sync_error = ?, updated_at = ?
      WHERE user_id = ?
    `).run(err.message || 'Sync failed', new Date().toISOString(), req.user.id);

    res.status(500).json({ error: err.message || 'Failed to sync Webtop data' });
  }
});

// DELETE /api/webtop/config - remove credentials and clear synced data
app.delete('/api/webtop/config', authenticate, (req, res) => {
  try {
    const deleteTx = db.transaction(() => {
      db.prepare('DELETE FROM webtop_credentials WHERE user_id = ?').run(req.user.id);
      db.prepare('DELETE FROM incidents WHERE user_id = ?').run(req.user.id);
      db.prepare('DELETE FROM homework WHERE user_id = ?').run(req.user.id);
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
    let query = `
      SELECT id, student_id as studentId, student_name as studentName, date, type, subject, teacher, description, hour_num as hourNum, is_justified as isJustified, event_code as eventCode, raw_data as rawData, created_at as createdAt
      FROM incidents
      WHERE user_id = ?
    `;
    const params = [req.user.id];

    if (childId && childId !== 'all') {
      const creds = db.prepare('SELECT linked_children FROM webtop_credentials WHERE user_id = ?').get(req.user.id);
      const linked = JSON.parse(creds?.linked_children || '[]');
      const child = linked.find(c => c.id === childId);
      if (child) {
        const childFullName = `${child.firstName} ${child.lastName}`.trim();
        query += ` AND (student_id = ? OR student_name = ?)`;
        params.push(childId, childFullName);
      } else {
        query += ` AND student_id = ?`;
        params.push(childId);
      }
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
    let query = `
      SELECT id, student_id as studentId, student_name as studentName, subject, teacher, due_date as dueDate, description, lesson_subject as lessonSubject, hour_num as hourNum, completed, raw_data as rawData, created_at as createdAt
      FROM homework
      WHERE user_id = ?
    `;
    const params = [req.user.id];

    if (childId && childId !== 'all') {
      const creds = db.prepare('SELECT linked_children FROM webtop_credentials WHERE user_id = ?').get(req.user.id);
      const linked = JSON.parse(creds?.linked_children || '[]');
      const child = linked.find(c => c.id === childId);
      if (child) {
        const childFullName = `${child.firstName} ${child.lastName}`.trim();
        query += ` AND (student_id = ? OR student_name = ?)`;
        params.push(childId, childFullName);
      } else {
        query += ` AND student_id = ?`;
        params.push(childId);
      }
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
    const item = db.prepare('SELECT id, completed FROM homework WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!item) {
      return res.status(404).json({ error: 'Homework item not found' });
    }

    const newCompleted = item.completed ? 0 : 1;
    db.prepare('UPDATE homework SET completed = ? WHERE id = ? AND user_id = ?').run(newCompleted, req.params.id, req.user.id);

    res.json({ success: true, completed: Boolean(newCompleted) });
  } catch (err) {
    console.error('Failed to toggle homework:', err);
    res.status(500).json({ error: 'Failed to toggle homework' });
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

