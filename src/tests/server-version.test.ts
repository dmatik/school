import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../mobile/src/lib/storage', () => ({
  mobileStorage: {
    getServerUrl: vi.fn(),
    setServerUrl: vi.fn(),
    clearServerUrl: vi.fn(),
    getAuthToken: vi.fn(),
    setAuthToken: vi.fn(),
    clearAuthToken: vi.fn(),
    getTheme: vi.fn(),
    setTheme: vi.fn(),
    getLanguage: vi.fn(),
    setLanguage: vi.fn(),
  },
}));

import { resolveServerVersion } from '../../server/version.js';
import { fetchServerVersion, setActiveSession } from '../../mobile/src/lib/api';

describe('resolveServerVersion', () => {
  let tmpDir: string;
  let pkgPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'school-version-'));
    pkgPath = path.join(tmpDir, 'package.json');
    fs.writeFileSync(pkgPath, JSON.stringify({ name: 'school', version: '1.6.4' }));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('prefers APP_VERSION when it is a non-empty non-placeholder value', () => {
    expect(resolveServerVersion({ envVersion: '1.8.0', packageJsonPath: pkgPath })).toBe('1.8.0');
  });

  it('falls back to package.json when APP_VERSION is 0.0.0 or empty', () => {
    expect(resolveServerVersion({ envVersion: '0.0.0', packageJsonPath: pkgPath })).toBe('1.6.4');
    expect(resolveServerVersion({ envVersion: '   ', packageJsonPath: pkgPath })).toBe('1.6.4');
    expect(resolveServerVersion({ envVersion: undefined, packageJsonPath: pkgPath })).toBe('1.6.4');
  });

  it('returns null when neither APP_VERSION nor package.json provides a version', () => {
    expect(
      resolveServerVersion({
        envVersion: '0.0.0',
        packageJsonPath: path.join(tmpDir, 'missing.json'),
      })
    ).toBeNull();
  });
});

describe('fetchServerVersion', () => {
  afterEach(() => {
    setActiveSession(null, null);
    vi.restoreAllMocks();
  });

  it('returns the live server version reported by /api/health', async () => {
    setActiveSession('https://school.example.com', 'jwt-token');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', app: 'school', version: '1.5.2' }),
    } as Response);

    const version = await fetchServerVersion();

    expect(version).toBe('1.5.2');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://school.example.com/api/health',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('returns null when an older server omits version from /api/health', async () => {
    setActiveSession('https://school.example.com', 'jwt-token');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', app: 'school' }),
    } as Response);

    expect(await fetchServerVersion()).toBeNull();
  });

  it('returns null on HTTP errors, invalid app payload, or network failure', async () => {
    setActiveSession('https://school.example.com', 'jwt-token');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 503,
    } as Response);
    expect(await fetchServerVersion()).toBeNull();

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'ok', app: 'other', version: '1.0.0' }),
    } as Response);
    expect(await fetchServerVersion()).toBeNull();

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));
    expect(await fetchServerVersion()).toBeNull();
  });

  it('returns null when no server URL is configured', async () => {
    setActiveSession(null, null);
    expect(await fetchServerVersion()).toBeNull();
  });
});
