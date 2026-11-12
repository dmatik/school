import { WebtopAuthError } from './webtop.js';
import { webtopLog } from './webtopLogger.js';

export const AUTO_SYNC_TIMEZONE = 'Asia/Jerusalem';
export const AUTO_SYNC_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours
export const AUTO_SYNC_JITTER = 0.15; // ±15%
export const AUTO_SYNC_MIN_GAP_MS = 30 * 60 * 1000; // never auto-sync more often than every 30 min
export const QUIET_START_HOUR = 23; // inclusive
export const QUIET_END_HOUR = 6; // exclusive
export const MAX_AUTH_FAILURES = 2;
const TRANSIENT_BACKOFF_MS = [60 * 60 * 1000, 4 * 60 * 60 * 1000]; // 1h, then 4h

/**
 * Automatic syncing is a production-only feature. In development and tests Webtop is
 * only ever contacted on demand (header / settings sync button).
 * WEBTOP_AUTO_SYNC=off is an operational kill switch for production.
 */
export function isAutoSyncAllowed(env = process.env) {
  return env.NODE_ENV === 'production' && env.WEBTOP_AUTO_SYNC !== 'off';
}

const hourFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: AUTO_SYNC_TIMEZONE,
  hour: '2-digit',
  hourCycle: 'h23'
});

export function isQuietHour(date) {
  const hour = parseInt(hourFormatter.format(date), 10);
  return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR;
}

/** Delay until the next automatic sync: 3h ±15%, pushed past quiet hours if needed. */
export function computeNextDelayMs(nowMs, random = Math.random, baseMs = AUTO_SYNC_INTERVAL_MS) {
  const jitter = 1 + (random() * 2 - 1) * AUTO_SYNC_JITTER;
  let target = nowMs + Math.round(baseMs * jitter);
  const step = 5 * 60 * 1000;
  let guard = 0;
  while (isQuietHour(new Date(target)) && guard++ < 12 * 12) {
    target += step;
  }
  if (guard > 0) {
    // Spread the morning syncs a little so we do not fire exactly at 06:00
    target += Math.round(random() * 20 * 60 * 1000);
  }
  return target - nowMs;
}

export function createAutoSync({
  db,
  runSync,
  now = () => Date.now(),
  random = Math.random,
  allowed = isAutoSyncAllowed,
  logger = webtopLog
}) {
  let timer = null;
  let transientFailures = 0;

  const getCreds = () => db.prepare(`
    SELECT id, last_synced_at, auto_sync_enabled, consecutive_failures, next_sync_at, auto_sync_paused_reason
    FROM webtop_credentials ORDER BY updated_at DESC LIMIT 1
  `).get();

  const setNextSync = (credsId, delayMs) => {
    db.prepare('UPDATE webtop_credentials SET next_sync_at = ? WHERE id = ?')
      .run(new Date(now() + delayMs).toISOString(), credsId);
  };

  function schedule(delayMs) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(tick, delayMs);
    if (timer.unref) timer.unref();
    const creds = getCreds();
    if (creds) setNextSync(creds.id, delayMs);
  }

  function isFresh(creds) {
    if (!creds.last_synced_at) return false;
    return now() - new Date(creds.last_synced_at).getTime() < AUTO_SYNC_MIN_GAP_MS;
  }

  /** Why an automatic sync should not run right now (null = go). */
  function blockedReason(creds) {
    if (!allowed()) return 'disabled_in_environment';
    if (!creds) return 'not_configured';
    if (!creds.auto_sync_enabled) return 'disabled';
    if (creds.auto_sync_paused_reason) return 'paused';
    if (isQuietHour(new Date(now()))) return 'quiet_hours';
    if (isFresh(creds)) return 'fresh';
    return null;
  }

  /** Called after any sync attempt (manual or automatic). No-op outside production. */
  function recordResult(error) {
    if (!allowed()) return;
    const creds = getCreds();
    if (!creds) return;
    if (!error) {
      transientFailures = 0;
      db.prepare(`UPDATE webtop_credentials SET consecutive_failures = 0, auto_sync_paused_reason = NULL WHERE id = ?`)
        .run(creds.id);
      return;
    }
    if (error instanceof WebtopAuthError) {
      const failures = (creds.consecutive_failures || 0) + 1;
      const reason = failures >= MAX_AUTH_FAILURES ? 'auth_failed' : null;
      db.prepare(`UPDATE webtop_credentials SET consecutive_failures = ?, auto_sync_paused_reason = ? WHERE id = ?`)
        .run(failures, reason, creds.id);
      if (reason) logger.lockout('[AutoSync] Auto-sync paused after repeated wrong-password failures', { failures });
    }
  }

  async function runGuarded() {
    try {
      const result = await runSync();
      return { ran: true, result };
    } catch (err) {
      return { ran: true, error: err };
    }
  }

  async function tick() {
    timer = null;
    const creds = getCreds();
    const reason = blockedReason(creds);
    if (reason) logger.info(`[AutoSync] Scheduled check skipped: ${reason}`);
    if (reason && reason !== 'fresh' && reason !== 'quiet_hours') {
      // Disabled / paused / not configured: just check again later
      if (allowed()) schedule(computeNextDelayMs(now(), random));
      return;
    }
    if (!reason) {
      const outcome = await runGuarded();
      if (outcome.error) {
        if (outcome.error instanceof WebtopAuthError) logger.lockout(`[AutoSync] Sync failed: ${outcome.error.message}`);
        else logger.warn(`[AutoSync] Sync failed: ${outcome.error.message}`);
        if (!(outcome.error instanceof WebtopAuthError)) {
          const backoff = TRANSIENT_BACKOFF_MS[Math.min(transientFailures, TRANSIENT_BACKOFF_MS.length - 1)];
          transientFailures += 1;
          schedule(computeNextDelayMs(now(), random, backoff));
          return;
        }
        // Auth failure: retry after 1h (pause is applied by recordResult after 2 failures)
        schedule(computeNextDelayMs(now(), random, TRANSIENT_BACKOFF_MS[0]));
        return;
      }
    }
    const nextDelay = computeNextDelayMs(now(), random);
    logger.info(`[AutoSync] Next check in ${Math.round(nextDelay / 60000)} min`);
    schedule(nextDelay);
  }

  /** Sync on app open if data is stale. Always safe to call; returns why it skipped. */
  async function syncIfStale() {
    const creds = getCreds();
    const reason = blockedReason(creds);
    if (reason) return { skipped: true, reason };
    const outcome = await runGuarded();
    if (outcome.error) throw outcome.error;
    return { skipped: false, result: outcome.result };
  }

  function start() {
    if (!allowed()) return false;
    const creds = getCreds();
    let delay = computeNextDelayMs(now(), random);
    // After a restart, honour a previously persisted next_sync_at so restarts never cause bursts.
    if (creds?.next_sync_at) {
      const persisted = new Date(creds.next_sync_at).getTime() - now();
      if (persisted > 0 && persisted < delay) delay = persisted;
    }
    // Do not fire immediately on boot: wait at least the minimum gap since the last sync.
    if (creds?.last_synced_at) {
      const sinceLast = now() - new Date(creds.last_synced_at).getTime();
      if (sinceLast < AUTO_SYNC_MIN_GAP_MS) delay = Math.max(delay, AUTO_SYNC_MIN_GAP_MS - sinceLast);
    }
    schedule(delay);
    logger.info(`[AutoSync] Enabled. First check in ${Math.round(delay / 60000)} min`);
    return true;
  }

  function stop() {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function getStatus() {
    const creds = getCreds();
    return {
      autoSyncAvailable: allowed(),
      autoSyncEnabled: Boolean(creds?.auto_sync_enabled),
      autoSyncPaused: Boolean(creds?.auto_sync_paused_reason),
      autoSyncPausedReason: creds?.auto_sync_paused_reason || null,
      nextSyncAt: allowed() && creds?.auto_sync_enabled && !creds?.auto_sync_paused_reason ? creds?.next_sync_at || null : null
    };
  }

  function setEnabled(enabled) {
    const creds = getCreds();
    if (!creds) return false;
    db.prepare(`
      UPDATE webtop_credentials
      SET auto_sync_enabled = ?, consecutive_failures = 0, auto_sync_paused_reason = NULL
      WHERE id = ?
    `).run(enabled ? 1 : 0, creds.id);
    if (enabled && allowed()) schedule(computeNextDelayMs(now(), random));
    return true;
  }

  return { start, stop, tick, syncIfStale, recordResult, getStatus, setEnabled, blockedReason };
}
