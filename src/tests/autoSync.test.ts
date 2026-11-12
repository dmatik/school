import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { initDb } from '../../server/db.js';
import {
  isAutoSyncAllowed,
  isQuietHour,
  computeNextDelayMs,
  createAutoSync,
  AUTO_SYNC_MIN_GAP_MS,
} from '../../server/autoSync.js';
import { WebtopClient, WebtopAuthError, clearWebtopSession } from '../../server/webtop.js';

const quietLogger = { info() {}, warn() {}, lockout() {} };

describe('Auto-sync environment gating', () => {
  it('is allowed only in production', () => {
    expect(isAutoSyncAllowed({ NODE_ENV: 'production' })).toBe(true);
    expect(isAutoSyncAllowed({ NODE_ENV: 'development' })).toBe(false);
    expect(isAutoSyncAllowed({ NODE_ENV: 'test' })).toBe(false);
    expect(isAutoSyncAllowed({})).toBe(false);
  });

  it('honours the WEBTOP_AUTO_SYNC=off kill switch in production', () => {
    expect(isAutoSyncAllowed({ NODE_ENV: 'production', WEBTOP_AUTO_SYNC: 'off' })).toBe(false);
  });

  it('never schedules a timer or runs when not allowed', async () => {
    const db = new Database(':memory:');
    initDb(db);
    const runSync = vi.fn();
    const spy = vi.spyOn(globalThis, 'setTimeout');
    const auto = createAutoSync({ db, runSync, allowed: () => false, logger: quietLogger });
    expect(auto.start()).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    expect(await auto.syncIfStale()).toEqual({ skipped: true, reason: 'disabled_in_environment' });
    expect(runSync).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('Quiet hours & scheduling (Asia/Jerusalem)', () => {
  it('treats 23:00-06:00 Jerusalem time as quiet', () => {
    // Winter: Jerusalem = UTC+2
    expect(isQuietHour(new Date('2026-01-15T21:00:00Z'))).toBe(true); // 23:00
    expect(isQuietHour(new Date('2026-01-15T03:59:00Z'))).toBe(true); // 05:59
    expect(isQuietHour(new Date('2026-01-15T04:00:00Z'))).toBe(false); // 06:00
    expect(isQuietHour(new Date('2026-01-15T20:59:00Z'))).toBe(false); // 22:59
    // Summer: Jerusalem = UTC+3
    expect(isQuietHour(new Date('2026-07-15T20:00:00Z'))).toBe(true); // 23:00
    expect(isQuietHour(new Date('2026-07-15T03:00:00Z'))).toBe(false); // 06:00
  });

  it('uses ~3h ±15% when the target is outside quiet hours', () => {
    const now = new Date('2026-01-15T08:00:00Z').getTime(); // 10:00 Jerusalem -> target ~13:00
    const lo = computeNextDelayMs(now, () => 0);
    const hi = computeNextDelayMs(now, () => 1);
    const base = 3 * 3600 * 1000;
    expect(lo).toBe(Math.round(base * 0.85));
    expect(hi).toBe(Math.round(base * 1.15));
  });

  it('never lands inside quiet hours', () => {
    const start = new Date('2026-01-15T10:00:00Z').getTime();
    for (let i = 0; i < 200; i++) {
      const now = start + i * 17 * 60 * 1000;
      const delay = computeNextDelayMs(now, Math.random);
      // morning spread may add up to 20 minutes after 06:00, which is still not quiet
      expect(isQuietHour(new Date(now + delay))).toBe(false);
    }
  });
});

describe('Auto-sync circuit breaker & triggers', () => {
  let db: ReturnType<typeof Database>;
  const logger = quietLogger;
  const noon = new Date('2026-01-15T10:00:00Z').getTime(); // 12:00 Jerusalem

  beforeEach(() => {
    db = new Database(':memory:');
    initDb(db);
    db.prepare(`INSERT INTO webtop_credentials (id, user_id, username, encrypted_password, created_at, updated_at)
      VALUES ('c1', 'family', 'u', 'x', '2026-01-01', '2026-01-01')`).run();
  });

  afterEach(() => db.close());

  const make = (runSync = vi.fn().mockResolvedValue({}), now = noon) =>
    createAutoSync({ db, runSync, now: () => now, allowed: () => true, logger });

  it('pauses after 2 consecutive auth failures and ignores network errors', () => {
    const auto = make();
    auto.recordResult(new Error('network down'));
    expect(auto.getStatus().autoSyncPaused).toBe(false);
    auto.recordResult(new WebtopAuthError('bad password'));
    expect(auto.getStatus().autoSyncPaused).toBe(false);
    auto.recordResult(new WebtopAuthError('bad password'));
    expect(auto.getStatus().autoSyncPaused).toBe(true);
    expect(auto.getStatus().autoSyncPausedReason).toBe('auth_failed');
  });

  it('a success resets the failure counter', () => {
    const auto = make();
    auto.recordResult(new WebtopAuthError('x'));
    auto.recordResult(null);
    auto.recordResult(new WebtopAuthError('x'));
    expect(auto.getStatus().autoSyncPaused).toBe(false);
  });

  it('does not sync while paused; resuming re-enables it', async () => {
    const runSync = vi.fn().mockResolvedValue({});
    const auto = make(runSync);
    auto.recordResult(new WebtopAuthError('x'));
    auto.recordResult(new WebtopAuthError('x'));
    expect(await auto.syncIfStale()).toEqual({ skipped: true, reason: 'paused' });
    auto.setEnabled(true);
    auto.stop();
    expect((await auto.syncIfStale()).skipped).toBe(false);
    expect(runSync).toHaveBeenCalledTimes(1);
  });

  it('skips when data is fresher than the 30 minute minimum gap', async () => {
    db.prepare('UPDATE webtop_credentials SET last_synced_at = ?').run(new Date(noon - AUTO_SYNC_MIN_GAP_MS + 60000).toISOString());
    expect(await make().syncIfStale()).toEqual({ skipped: true, reason: 'fresh' });
  });

  it('syncs on open when stale, and skips during quiet hours or when disabled', async () => {
    db.prepare('UPDATE webtop_credentials SET last_synced_at = ?').run(new Date(noon - 2 * 3600 * 1000).toISOString());
    const runSync = vi.fn().mockResolvedValue({ ok: 1 });
    expect((await make(runSync).syncIfStale()).skipped).toBe(false);

    const night = new Date('2026-01-15T22:00:00Z').getTime(); // 00:00 Jerusalem
    expect(await make(runSync, night).syncIfStale()).toEqual({ skipped: true, reason: 'quiet_hours' });

    db.prepare('UPDATE webtop_credentials SET auto_sync_enabled = 0').run();
    expect(await make(runSync).syncIfStale()).toEqual({ skipped: true, reason: 'disabled' });
    expect(runSync).toHaveBeenCalledTimes(1);
  });

  it('does not record anything outside production', () => {
    const auto = createAutoSync({ db, runSync: vi.fn(), allowed: () => false, logger });
    auto.recordResult(new WebtopAuthError('x'));
    auto.recordResult(new WebtopAuthError('x'));
    expect(auto.getStatus().autoSyncPaused).toBe(false);
  });
});

describe('Webtop session reuse', () => {
  const okJson = (body: unknown, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status: 200, headers });

  beforeEach(() => clearWebtopSession());
  afterEach(() => vi.unstubAllGlobals());

  it('logs in once for several clients/syncs with the same user', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      calls.push(url);
      if (url.includes('LoginByUserNameAndPassword')) return okJson({ status: true, data: { token: 't1' } });
      return okJson({ status: true, data: { childrens: [] } });
    }));

    for (let i = 0; i < 3; i++) {
      const c = new WebtopClient();
      await c.useSession('user', 'pass');
      await c.initDashboard();
    }
    expect(calls.filter(u => u.includes('LoginByUserNameAndPassword'))).toHaveLength(1);
  });

  it('re-logs in exactly once, and retries once, when the session has expired', async () => {
    let dashboardCalls = 0;
    const logins: number[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('LoginByUserNameAndPassword')) {
        logins.push(1);
        return okJson({ status: true, data: { token: `t${logins.length}` } });
      }
      dashboardCalls++;
      if (dashboardCalls === 2) return new Response('', { status: 401 });
      return okJson({ status: true, data: { ok: true } });
    }));

    const c1 = new WebtopClient();
    await c1.useSession('user', 'pass');
    await c1.initDashboard(); // call 1 ok
    const c2 = new WebtopClient();
    await c2.useSession('user', 'pass'); // cached
    await c2.initDashboard(); // call 2 -> 401 -> re-login -> call 3 ok
    expect(logins).toHaveLength(2);
    expect(dashboardCalls).toBe(3);
  });

  it('throws WebtopAuthError if the session cannot be renewed', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('LoginByUserNameAndPassword')) return okJson({ status: false, message: 'Wrong password' });
      return new Response('', { status: 401 });
    }));
    const c = new WebtopClient();
    await expect(c.useSession('user', 'bad')).rejects.toBeInstanceOf(WebtopAuthError);
  });

  it('treats network/server errors as non-auth errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('LoginByUserNameAndPassword')) return okJson({ status: true, data: { token: 't' } });
      return new Response('', { status: 503 });
    }));
    const c = new WebtopClient();
    await c.useSession('user', 'pass');
    const err = await c.initDashboard().catch(e => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(WebtopAuthError);
  });
});
