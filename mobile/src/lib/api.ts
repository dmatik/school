import { mobileStorage } from './storage';

export class ServerNotConfiguredError extends Error {
  constructor(message = 'Self-hosted server URL is not configured') {
    super(message);
    this.name = 'ServerNotConfiguredError';
  }
}

let activeServerUrl: string | null = null;
let activeAuthToken: string | null = null;

export function setActiveSession(serverUrl: string | null, token: string | null) {
  activeServerUrl = serverUrl;
  activeAuthToken = token;
}

export function getActiveServerUrl(): string | null {
  return activeServerUrl;
}

export function getActiveAuthToken(): string | null {
  return activeAuthToken;
}

/**
 * Normalizes and validates a user-provided self-hosted server URL.
 * Rejects missing protocols or malformed URLs so the app never runs standalone.
 */
export function normalizeServerUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('SERVER_URL_REQUIRED');
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error('SERVER_URL_INVALID');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('SERVER_URL_INVALID');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('SERVER_URL_INVALID');
  }

  let cleanPath = parsed.pathname.replace(/\/+$/, '');
  if (cleanPath.toLowerCase() === '/api') {
    cleanPath = '';
  }

  return `${parsed.origin}${cleanPath}`;
}

/**
 * Verifies that the target self-hosted School server is reachable.
 */
export async function verifyServerConnection(serverUrl: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${serverUrl}/api/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return Boolean(data && data.status === 'ok' && data.app === 'school');
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function hydrateSession(): Promise<{ serverUrl: string | null; token: string | null }> {
  const [serverUrl, token] = await Promise.all([
    mobileStorage.getServerUrl(),
    mobileStorage.getAuthToken(),
  ]);
  activeServerUrl = serverUrl;
  activeAuthToken = token;
  return { serverUrl, token };
}

export async function persistSession(serverUrl: string, token: string): Promise<void> {
  activeServerUrl = serverUrl;
  activeAuthToken = token;
  await Promise.all([
    mobileStorage.setServerUrl(serverUrl),
    mobileStorage.setAuthToken(token),
  ]);
}

export async function clearAuthOnly(): Promise<void> {
  activeAuthToken = null;
  await mobileStorage.clearAuthToken();
}

/**
 * Executes an authenticated (or public) API request against the configured self-hosted server.
 * Throws ServerNotConfiguredError if no server URL is configured (non-standalone).
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  if (!activeServerUrl) {
    throw new ServerNotConfiguredError();
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${activeServerUrl}${normalizedPath}`;

  const headers = new Headers(options.headers || {});
  if (activeAuthToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${activeAuthToken}`);
  }
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
