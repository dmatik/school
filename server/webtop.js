import crypto from 'crypto';

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

export class WebtopClient {
  constructor() {
    this.cookieHeader = '';
    this.token = '';
    this.user = null;
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

  async login(username, password) {
    if (!username || !password) {
      throw new Error('Webtop username and password are required');
    }

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    const response = await fetch(`${WEBTOP_API_BASE}/api/user/LoginByUserNameAndPassword`, {
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

    if (!response.ok) {
      throw new Error(`Webtop authentication HTTP error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.status) {
      const msg = data.message || 'Invalid Webtop credentials';
      throw new Error(msg);
    }

    const rawCookie = response.headers.get('set-cookie') || '';
    this.token = data.data?.token || '';
    if (rawCookie) {
      this.cookieHeader = rawCookie.split(',').map(c => c.split(';')[0].trim()).join('; ');
    } else if (this.token) {
      this.cookieHeader = `webToken=${this.token}`;
    }

    this.user = data.data;
    return this.user;
  }

  async initDashboard() {
    const response = await fetch(`${WEBTOP_API_BASE}/api/dashboard/InitDashboard`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`Failed to initialize Webtop dashboard: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.status) {
      throw new Error(data.message || 'Failed to fetch dashboard data');
    }

    return data.data || {};
  }

  async getIncidents(childId, classCode) {
    const response = await fetch(`${WEBTOP_API_BASE}/api/dashboard/GetPupilDiciplineEvents`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        id: childId,
        ClassCode: classCode
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch discipline events: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.status) {
      throw new Error(data.message || 'Failed to fetch incidents');
    }

    const events = data.data?.dataTable?.diciplineEvents || [];
    return events;
  }

  async getHomework(childId, classCode, classNum) {
    const response = await fetch(`${WEBTOP_API_BASE}/api/dashboard/GetHomeWork`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        id: childId,
        ClassCode: classCode,
        ClassNumber: classNum
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch homework: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.status) {
      throw new Error(data.message || 'Failed to fetch homework');
    }

    const lessons = data.data?.dataTable || [];
    return lessons;
  }

  async getWeeklyLessonsAndHomework(childId, classCode, studyYear = getWebtopStudyYear(), weekIndex = 0) {
    const response = await fetch(`${WEBTOP_API_BASE}/api/PupilCard/GetPupilLessonsAndHomework`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        studentID: childId,
        classCode: classCode,
        studyYear: studyYear,
        weekIndex: weekIndex,
        moduleID: 11
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch weekly lessons and homework: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.status) {
      throw new Error(data.message || 'Failed to fetch weekly lessons and homework');
    }

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


