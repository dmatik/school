import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createWebtopLogger, createLogger, getLogLevel, maskUser, formatJerusalemTime } from '../../server/webtopLogger.js';
import { WebtopClient, WebtopAuthError, clearWebtopSession } from '../../server/webtop.js';

const makeSink = () => ({ log: vi.fn(), warn: vi.fn(), error: vi.fn() });
const all = (s: ReturnType<typeof makeSink>) => [...s.log.mock.calls, ...s.warn.mock.calls, ...s.error.mock.calls].map(c => c.join(' ')).join('\n');

describe('Webtop leveled logger', () => {
  it('defaults to errors and falls back on invalid values', () => {
    const sink = makeSink();
    expect(getLogLevel({}, sink as unknown as Console)).toBe('errors');
    expect(getLogLevel({ LOG_LEVEL: 'ALL' }, sink as unknown as Console)).toBe('all');
    expect(getLogLevel({ LOG_LEVEL: 'verbose' }, sink as unknown as Console)).toBe('errors');
  });

  it('level "all" prints info, warnings and lockouts', () => {
    const sink = makeSink();
    const log = createWebtopLogger({ env: { LOG_LEVEL: 'all' }, sink: sink as unknown as Console });
    log.info('Login attempt');
    log.warn('Call failed');
    log.lockout('Login rejected');
    expect(sink.log).toHaveBeenCalledTimes(1);
    expect(sink.warn).toHaveBeenCalledTimes(1);
    expect(sink.error).toHaveBeenCalledTimes(1);
  });

  it('level "errors" prints warnings and lockouts but no info', () => {
    const sink = makeSink();
    const log = createWebtopLogger({ env: { LOG_LEVEL: 'errors' }, sink: sink as unknown as Console });
    log.info('Login attempt');
    log.warn('Call failed');
    log.lockout('Login rejected');
    expect(sink.log).not.toHaveBeenCalled();
    expect(sink.warn).toHaveBeenCalledTimes(1);
    expect(sink.error).toHaveBeenCalledTimes(1);
  });

  it('supports [App] prefix with unmasked usernames and sanitizes newlines', () => {
    const sink = makeSink();
    const appLogger = createLogger({ env: { LOG_LEVEL: 'all' }, sink: sink as unknown as Console, prefix: 'App' });
    appLogger.info('User login ok', { method: 'password', user: 'dana', role: 'user' });
    appLogger.warn('User login failed', { method: 'password', user: 'bad\nuser', reason: 'invalid_credentials' });

    expect(sink.log).toHaveBeenCalledTimes(1);
    expect(sink.log.mock.calls[0][0]).toContain('[App]');
    expect(sink.log.mock.calls[0][0]).toContain('INFO User login ok method=password user=dana role=user');
    expect(sink.warn).toHaveBeenCalledTimes(1);
    expect(sink.warn.mock.calls[0][0]).toContain('[App]');
    expect(sink.warn.mock.calls[0][0]).toContain('WARN User login failed method=password user=bad user reason=invalid_credentials');
    expect(sink.warn.mock.calls[0][0]).not.toContain('\n');
  });

  it('[App] logger prints failed logins at "errors" level but suppresses info', () => {
    const sink = makeSink();
    const appLogger = createLogger({ env: { LOG_LEVEL: 'errors' }, sink: sink as unknown as Console, prefix: 'App' });
    appLogger.info('User login ok', { method: 'password', user: 'dana' });
    appLogger.warn('User login failed', { method: 'password', user: 'dana', reason: 'invalid_credentials' });

    expect(sink.log).not.toHaveBeenCalled();
    expect(sink.warn).toHaveBeenCalledTimes(1);
    expect(sink.warn.mock.calls[0][0]).toContain('[App]');
  });

  it('masks usernames', () => {
    expect(maskUser('dmitry')).toBe('d****y');
    expect(maskUser('ab')).toBe('**');
  });

  it('formats timestamp in Asia/Jerusalem timezone', () => {
    // 2026-01-15T12:34:56.789Z in UTC is winter in Israel (UTC+2) -> 14:34:56.789
    const winterUtc = new Date('2026-01-15T12:34:56.789Z');
    expect(formatJerusalemTime(winterUtc)).toBe('2026-01-15 14:34:56.789');

    // 2026-07-15T12:34:56.123Z in UTC is daylight saving in Israel (UTC+3) -> 15:34:56.123
    const summerUtc = new Date('2026-07-15T12:34:56.123Z');
    expect(formatJerusalemTime(summerUtc)).toBe('2026-07-15 15:34:56.123');
  });
});

describe('Webtop client logging', () => {
  let sink: ReturnType<typeof makeSink>;
  const okJson = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

  beforeEach(() => {
    clearWebtopSession();
    sink = makeSink();
    vi.spyOn(console, 'log').mockImplementation(sink.log);
    vi.spyOn(console, 'warn').mockImplementation(sink.warn);
    vi.spyOn(console, 'error').mockImplementation(sink.error);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.LOG_LEVEL;
  });

  it('wrong password logs a lockout line at both levels, without secrets', async () => {
    for (const level of ['all', 'errors']) {
      process.env.LOG_LEVEL = level;
      sink.error.mockClear();
      clearWebtopSession();
      vi.stubGlobal('fetch', vi.fn(async () => okJson({ status: false, message: 'bad' })));
      await expect(new WebtopClient().login('dmitry', 'SuperSecret1')).rejects.toBeInstanceOf(WebtopAuthError);
      expect(sink.error).toHaveBeenCalledTimes(1);
      const out = all(sink);
      expect(out).toContain('LOCKOUT');
      expect(out).not.toContain('SuperSecret1');
      expect(out).not.toContain('dmitry');
    }
  });

  it('successful login and call are printed only at "all"', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('Login')) return okJson({ status: true, data: { token: 'tok-secret' } });
      if (url.includes('InitDashboard')) {
        return okJson({
          status: true,
          data: {
            childrens: [{ id: 'child123', firstName: 'Dana', lastName: 'Levi' }]
          }
        });
      }
      return okJson({ status: true, data: {} });
    }));

    process.env.LOG_LEVEL = 'errors';
    const c1 = new WebtopClient();
    await c1.useSession('dmitry', 'pw');
    await c1.initDashboard();
    expect(all(sink)).toBe('');

    process.env.LOG_LEVEL = 'all';
    clearWebtopSession();
    const c2 = new WebtopClient();
    await c2.useSession('dmitry', 'pw');
    await c2.initDashboard();
    await c2.getWeeklyLessonsAndHomework('child123', 5, 2026, -1);
    await c2.getIncidents('child456', 3, 'Noam Cohen');
    const out = all(sink);
    expect(out).toContain('Login ok');
    expect(out).toContain('Call POST /api/dashboard/InitDashboard');
    expect(out).toContain('Call POST /api/PupilCard/GetPupilLessonsAndHomework childId=child123 childName=Dana Levi classCode=5 week=-1');
    expect(out).toContain('Call POST /api/dashboard/GetPupilDiciplineEvents childId=child456 childName=Noam Cohen classCode=3');
    expect(out).not.toContain('tok-secret');
  });

  it('non-auth call failures are printed at "errors" level', async () => {
    process.env.LOG_LEVEL = 'errors';
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      url.includes('Login') ? okJson({ status: true, data: { token: 't' } }) : new Response('', { status: 503 })));
    const c = new WebtopClient();
    await c.useSession('dmitry', 'pw');
    await expect(c.initDashboard()).rejects.toThrow();
    expect(sink.warn).toHaveBeenCalledTimes(1);
  });

  it('retries transient ECONNRESET fetch errors on login and API calls', async () => {
    process.env.LOG_LEVEL = 'all';
    let loginAttempts = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('Login')) {
        loginAttempts++;
        if (loginAttempts === 1) {
          const err = new TypeError('fetch failed') as TypeError & { cause?: { code: string; message: string } };
          err.cause = { code: 'ECONNRESET', message: 'Client network socket disconnected before secure TLS connection was established' };
          throw err;
        }
        return okJson({ status: true, data: { token: 'tok' } });
      }
      return okJson({ status: true, data: { childrens: [] } });
    }));

    const c = new WebtopClient();
    await c.useSession('dmitry', 'pw');
    await c.initDashboard();
    expect(loginAttempts).toBe(2);
    expect(sink.warn).not.toHaveBeenCalled();
  });
});
