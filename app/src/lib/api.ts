import { Platform } from 'react-native';
import { mobileStorage } from './storage';
import { fetchHealthVersion } from '../../../shared/lib/server-version';

export const IS_COHOSTED_WEB = Platform.OS === 'web';

export function getDefaultWebBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  return envUrl ? envUrl.replace(/\/+$/, '') : '';
}

export class ServerNotConfiguredError extends Error {
  constructor(message = 'Self-hosted server URL is not configured') {
    super(message);
    this.name = 'ServerNotConfiguredError';
  }
}

let activeServerUrl: string | null = null;
let activeAuthToken: string | null = null;
let onUnauthorizedHandler: (() => void) | null = null;

export function setOnUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorizedHandler = handler;
}

export function setActiveSession(serverUrl: string | null, token: string | null) {
  activeServerUrl = serverUrl;
  activeAuthToken = token;
}

function isPrivateOrLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.local')) {
    return true;
  }
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const a = Number(ipv4[1]);
  const b = Number(ipv4[2]);
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
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
  if (parsed.protocol === 'http:' && !isPrivateOrLocalHost(parsed.hostname)) {
    throw new Error('SERVER_URL_HTTPS_REQUIRED');
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

/**
 * Fetches the live server version from the connected School server's /api/health endpoint.
 * Returns null if the server is older (no version field), unreachable, or returns an invalid payload.
 */
export async function fetchServerVersion(): Promise<string | null> {
  return fetchHealthVersion(apiFetch);
}

export async function hydrateSession(): Promise<{ serverUrl: string | null; token: string | null }> {
  if (IS_COHOSTED_WEB) {
    const token = await mobileStorage.getAuthToken();
    const serverUrl = getDefaultWebBaseUrl();
    activeServerUrl = serverUrl;
    activeAuthToken = token;
    return { serverUrl, token };
  }

  const [serverUrl, token] = await Promise.all([
    mobileStorage.getServerUrl(),
    mobileStorage.getAuthToken(),
  ]);
  activeServerUrl = serverUrl;
  activeAuthToken = token;
  return { serverUrl, token };
}

export async function persistSession(serverUrl: string, token: string): Promise<void> {
  if (IS_COHOSTED_WEB) {
    activeServerUrl = getDefaultWebBaseUrl();
    activeAuthToken = token;
    await mobileStorage.setAuthToken(token);
    return;
  }

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
 * On co-hosted web, defaults to same-origin (or EXPO_PUBLIC_API_URL in dev).
 * Throws ServerNotConfiguredError on native if no server URL is configured (non-standalone).
 */
export async function apiFetch(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  if (!IS_COHOSTED_WEB && !activeServerUrl) {
    throw new ServerNotConfiguredError();
  }

  const { timeoutMs = 15000, signal: externalSignal, ...fetchOptions } = options;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = IS_COHOSTED_WEB
    ? (activeServerUrl ?? getDefaultWebBaseUrl())
    : activeServerUrl!;
  const url = `${baseUrl}${normalizedPath}`;

  const headers = new Headers(fetchOptions.headers || {});
  const hadAuthToken = Boolean(activeAuthToken);
  if (activeAuthToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${activeAuthToken}`);
  }
  if (
    fetchOptions.body &&
    !(typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });
    if (res.status === 401 && hadAuthToken && onUnauthorizedHandler) {
      onUnauthorizedHandler();
    }
    return res;
  } finally {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}
