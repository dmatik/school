import crypto from 'crypto';
import { webtopLog, maskUser } from './webtopLogger.js';

const WEBTOP_API_BASE = 'https://webtopserver.smartschool.co.il/server';

// Server-side credential encryption (AES-256-GCM)
let cachedKeyBytes = null;

export function setEncryptionSecret(secret, salt = 'school-db-salt') {
  if (!secret) return;
  cachedKeyBytes = crypto.scryptSync(secret, salt, 32);
}

function getKeyBytes() {
  if (cachedKeyBytes) return cachedKeyBytes;
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (secret) {
    cachedKeyBytes = crypto.scryptSync(secret, 'school-db-salt', 32);
    return cachedKeyBytes;
  }
  if (process.env.NODE_ENV === 'test') {
    return crypto.scryptSync('school-test-credential-salt-only', 'school-db-salt', 32);
  }
  throw new Error('ENCRYPTION_KEY or JWT_SECRET must be configured for credential encryption');
}

export function encryptPassword(plainText) {
  if (!plainText) return '';
  const keyBytes = getKeyBytes();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBytes, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptPassword(cipherText) {
  if (!cipherText) return '';
  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted password format');
  }
  const keyBytes = getKeyBytes();
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBytes, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    // If decryption fails with the active secret, fallback to legacy static secret for backward compatibility
    try {
      const legacyKeyBytes = crypto.scryptSync('school-webtop-credential-salt-2026', 'school-db-salt', 32);
      const legacyDecipher = crypto.createDecipheriv('aes-256-gcm', legacyKeyBytes, iv);
      legacyDecipher.setAuthTag(authTag);
      let decrypted = legacyDecipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += legacyDecipher.final('utf8');
      return decrypted;
    } catch {
      throw err;
    }
  }
}

// Webtop Client-to-Server AES-256-CBC string encryption
export function encryptWebtopPayload(text) {
  const smartKey = Buffer.from('01234567890000000150778345678901', 'utf8');
  const iv = Buffer.from('6543210987654321', 'utf8');
  const stringified = JSON.stringify(text);

  const cipher = crypto.createCipheriv('aes-256-cbc', smartKey, iv);
  let encrypted = cipher.update(stringified, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

export function getWebtopStudyYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed: 0 = Jan, 7 = Aug, 8 = Sep
  return month >= 7 ? year + 1 : year;
}


/** Credentials rejected by Webtop (wrong/changed password) or a session that cannot be renewed. */
export class WebtopAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WebtopAuthError';
  }
}

const SESSION_EXPIRED_PATTERN = /expired|unauthori[sz]ed|not authenticated|not logged|session|פג תוקף|לא מחובר/i;

// In-memory session cache keyed by username so that repeated syncs reuse one login.
const sessionCache = new Map();

export function clearWebtopSession(username) {
  if (username) sessionCache.delete(username.trim());
  else sessionCache.clear();
}

export class WebtopClient {
  constructor() {
    this.cookieHeader = '';
    this.token = '';
    this.user = null;
    this.credentials = null;
    this.loginCount = 0;
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Origin': 'https://webtop.smartschool.co.il',
      'Referer': 'https://webtop.smartschool.co.il/',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...(this.cookieHeader ? { 'Cookie': this.cookieHeader } : {})
    };
  }

  /**
   * Reuse a cached session if one exists for this user; log in only when none is cached.
   * A later "session expired" response triggers exactly one transparent re-login (see request()).
   */
  async useSession(username, password) {
    this.credentials = { username, password };
    const cached = sessionCache.get((username || '').trim());
    webtopLog.info(cached ? 'Reusing cached session' : 'No cached session, login required', { user: maskUser(username) });
    if (cached) {
      this.cookieHeader = cached.cookieHeader;
      this.token = cached.token;
      this.user = cached.user;
      return this.user;
    }
    return this.login(username, password);
  }

  async login(username, password) {
    if (!username || !password) {
      throw new Error('Webtop username and password are required');
    }

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();
    sessionCache.delete(trimmedUser);
    this.cookieHeader = '';

    const user = maskUser(trimmedUser);
    const startedAt = Date.now();
    webtopLog.info('Login attempt', { user });
    let response;
    try {
      response = await this.loginFetch(trimmedUser, trimmedPass);
    } catch (err) {
      webtopLog.warn('Login request failed', { user, error: err.message, ms: Date.now() - startedAt });
      throw err;
    }
    this.loginCount += 1;

    if (!response.ok) {
      const msg = `Webtop authentication HTTP error: ${response.status}`;
      if (response.status === 401 || response.status === 403) {
        webtopLog.lockout('Login rejected', { user, status: response.status, ms: Date.now() - startedAt });
        throw new WebtopAuthError(msg);
      }
      webtopLog.warn('Login HTTP error', { user, status: response.status, ms: Date.now() - startedAt });
      throw new Error(msg);
    }

    const data = await response.json();
    if (!data.status) {
      webtopLog.lockout('Login rejected: invalid credentials', { user, ms: Date.now() - startedAt });
      throw new WebtopAuthError(data.message || 'Invalid Webtop credentials');
    }
    webtopLog.info('Login ok', { user, ms: Date.now() - startedAt });

    const rawCookie = response.headers.get('set-cookie') || '';
    this.token = data.data?.token || '';
    if (rawCookie) {
      this.cookieHeader = rawCookie.split(',').map(c => c.split(';')[0].trim()).join('; ');
    } else if (this.token) {
      this.cookieHeader = `webToken=${this.token}`;
    }

    this.user = data.data;
    sessionCache.set(trimmedUser, { cookieHeader: this.cookieHeader, token: this.token, user: this.user });
    return this.user;
  }

  loginFetch(trimmedUser, trimmedPass) {
    return fetch(`${WEBTOP_API_BASE}/api/user/LoginByUserNameAndPassword`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        UserName: trimmedUser,
        Password: trimmedPass,
        Data: encryptWebtopPayload(trimmedUser + '0'),
        captcha: null,
        RememberMe: true,
        BiometricLogin: '',
        UniqueId: crypto.randomUUID(),
        deviceDataJson: '{}'
      }),
      signal: AbortSignal.timeout(15000)
    });
  }

  /**
   * POST to a Webtop API path. If the session has expired, log in once and retry once.
   * Throws WebtopAuthError when the session cannot be renewed.
   */
  async request(apiPath, body, failureLabel) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const startedAt = Date.now();
      let response;
      try {
        response = await fetch(`${WEBTOP_API_BASE}${apiPath}`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15000)
        });
      } catch (err) {
        webtopLog.warn(`Call failed POST ${apiPath}`, { error: err.message, ms: Date.now() - startedAt });
        throw err;
      }
      webtopLog.info(`Call POST ${apiPath}`, { status: response.status, ms: Date.now() - startedAt, ...(attempt > 0 ? { retry: 'after-relogin' } : {}) });

      let data = null;
      let expired = response.status === 401 || response.status === 403;
      if (!expired && response.ok) {
        data = await response.json();
        if (!data.status && SESSION_EXPIRED_PATTERN.test(data.message || '')) expired = true;
      }

      if (expired) {
        webtopLog.info(`Session expired on ${apiPath}`, { willRelogin: Boolean(attempt === 0 && this.credentials) });
        if (this.credentials) sessionCache.delete(this.credentials.username.trim());
        if (attempt === 0 && this.credentials) {
          await this.login(this.credentials.username, this.credentials.password);
          continue;
        }
        webtopLog.lockout('Session expired and could not be renewed', { path: apiPath });
        throw new WebtopAuthError('Webtop session expired and could not be renewed');
      }

      if (!response.ok) {
        webtopLog.warn(`Call error POST ${apiPath}`, { status: response.status });
        throw new Error(`${failureLabel}: HTTP ${response.status}`);
      }
      if (!data.status) {
        throw new Error(data.message || failureLabel);
      }
      return data;
    }
    throw new WebtopAuthError('Webtop session expired and could not be renewed');
  }

  async initDashboard() {
    const data = await this.request('/api/dashboard/InitDashboard', {}, 'Failed to initialize Webtop dashboard');
    return data.data || {};
  }

  async getIncidents(childId, classCode) {
    const data = await this.request(
      '/api/dashboard/GetPupilDiciplineEvents',
      { id: childId, ClassCode: classCode },
      'Failed to fetch discipline events'
    );
    return data.data?.dataTable?.diciplineEvents || [];
  }

  async getHomework(childId, classCode, classNum) {
    const data = await this.request(
      '/api/dashboard/GetHomeWork',
      { id: childId, ClassCode: classCode, ClassNumber: classNum },
      'Failed to fetch homework'
    );
    return data.data?.dataTable || [];
  }

  async getWeeklyLessonsAndHomework(childId, classCode, studyYear = getWebtopStudyYear(), weekIndex = 0) {
    const data = await this.request(
      '/api/PupilCard/GetPupilLessonsAndHomework',
      { studentID: childId, classCode, studyYear, weekIndex, moduleID: 11 },
      'Failed to fetch weekly lessons and homework'
    );
    return Array.isArray(data.data) ? data.data : [];
  }
}


/**
 * Match a freshly synced child object (from Webtop API) against previously stored
 * linked children to preserve user configuration (badge color, selections, etc.),
 * even when Webtop generates new encrypted ephemeral tokens for student IDs across sessions or days.
 *
 * Matching strategy (in priority order):
 * 1. Exact ID match (if tokens have not rotated)
 * 2. Full Name match (firstName + lastName, normalized for whitespace & case)
 * 3. First Name + classCode match
 * 4. Index-based fallback if child count matches and names are compatible
 */
export function matchChildWithPrevious(rawChild, previousChildren, index = -1) {
  if (!rawChild || !Array.isArray(previousChildren) || previousChildren.length === 0) {
    return null;
  }

  // 1. Direct ID match
  if (rawChild.id) {
    const idMatch = previousChildren.find(p => p && p.id === rawChild.id);
    if (idMatch) return idMatch;
  }

  const norm = s => (s || '').toString().trim().replace(/\s+/g, ' ').toLowerCase();
  const rawFirst = norm(rawChild.firstName);
  const rawLast = norm(rawChild.lastName);
  const rawFull = `${rawFirst} ${rawLast}`.trim();

  // 2. Full name match (first + last)
  if (rawFull) {
    const nameMatch = previousChildren.find(p => {
      if (!p) return false;
      const prevFull = `${norm(p.firstName)} ${norm(p.lastName)}`.trim();
      return prevFull === rawFull;
    });
    if (nameMatch) return nameMatch;
  }

  // 3. First name + classCode match
  if (rawFirst && rawChild.classCode !== undefined && rawChild.classCode !== null) {
    const classMatch = previousChildren.find(p =>
      p &&
      norm(p.firstName) === rawFirst &&
      p.classCode === rawChild.classCode
    );
    if (classMatch) return classMatch;
  }

  // 4. Stable position / index fallback if the number of children matches
  if (typeof index === 'number' && index >= 0 && index < previousChildren.length) {
    const candidate = previousChildren[index];
    if (candidate) {
      const candFirst = norm(candidate.firstName);
      if (!candFirst || !rawFirst || candFirst === rawFirst) {
        return candidate;
      }
    }
  }

  return null;
}

/**
 * Generate a deterministic, stable child identifier from firstName and lastName.
 * Normalizes Unicode with NFKC, strips Hebrew niqqud and invisible direction marks,
 * serializes as JSON array to prevent delimiter collision, and outputs 32 hex chars (128-bit).
 * Example output: 'child_177cd5c698aba1ff...'
 */
export function generateChildId(firstName, lastName) {
  const clean = (str) =>
    (str || '')
      .toString()
      .normalize('NFKC')
      .replace(/[\u0591-\u05C7\u200E\u200F\u200B-\u200D\uFEFF]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();

  const normFirst = clean(firstName);
  const normLast = clean(lastName);
  const serialized = JSON.stringify([normFirst, normLast]);
  const digest = crypto.createHash('sha256').update(serialized).digest('hex').slice(0, 32);
  return `child_${digest}`;
}



