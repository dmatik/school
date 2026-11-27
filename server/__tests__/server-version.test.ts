import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { resolveServerVersion } from '../version.js';
import { fetchHealthVersion } from '../../shared/lib/server-version';

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

describe('fetchHealthVersion', () => {
  it('returns the live server version reported by /api/health', async () => {
    const fetcher = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', app: 'school', version: '1.5.2' }),
    } as Response);

    const version = await fetchHealthVersion(fetcher);

    expect(version).toBe('1.5.2');
    expect(fetcher).toHaveBeenCalledWith(
      '/api/health',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('returns null when an older server omits version from /api/health', async () => {
    const fetcher = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', app: 'school' }),
    } as Response);

    expect(await fetchHealthVersion(fetcher)).toBeNull();
  });

  it('returns null on HTTP errors, invalid app payload, or network failure', async () => {
    const httpError = jest.fn<typeof fetch>().mockResolvedValue({ ok: false, status: 503 } as Response);
    expect(await fetchHealthVersion(httpError)).toBeNull();

    const wrongApp = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', app: 'other', version: '1.0.0' }),
    } as Response);
    expect(await fetchHealthVersion(wrongApp)).toBeNull();

    const networkError = jest.fn<typeof fetch>().mockRejectedValue(new Error('Network error'));
    expect(await fetchHealthVersion(networkError)).toBeNull();
  });
});
