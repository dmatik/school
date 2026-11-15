/**
 * Leveled logger used for Webtop syncs and App user logins / state-changing operations.
 *
 * LOG_LEVEL:
 *   all    - everything: app logins, state-changing operations, every Webtop call, session events, sync summaries, plus errors
 *   errors - (default) only errors: failures, failed app logins, and wrong-password lockouts; no routine info
 *
 * Never pass passwords, tokens, cookies or request bodies to this logger.
 */
export const WEBTOP_LOG_TIMEZONE = 'Asia/Jerusalem';

const VALID_LEVELS = ['all', 'errors'];
let warnedInvalid = false;

const jerusalemDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: WEBTOP_LOG_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  hourCycle: 'h23'
});

export function formatJerusalemTime(date = new Date()) {
  const parts = jerusalemDateFormatter.formatToParts(date);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second}.${ms}`;
}

export function getLogLevel(env = process.env, sink = console) {
  const raw = (env.LOG_LEVEL || '').trim().toLowerCase();
  if (!raw) return 'errors';
  if (VALID_LEVELS.includes(raw)) return raw;
  if (!warnedInvalid) {
    warnedInvalid = true;
    sink.warn(`[Logger] Invalid LOG_LEVEL "${raw}", falling back to "errors" (valid: ${VALID_LEVELS.join(', ')})`);
  }
  return 'errors';
}

/** Mask a username so logs never contain it in full: "dmitry" -> "d****y". */
export function maskUser(username) {
  const u = String(username || '').trim();
  if (u.length <= 2) return '*'.repeat(u.length || 1);
  return `${u[0]}${'*'.repeat(Math.min(u.length - 2, 6))}${u[u.length - 1]}`;
}

function sanitizeLogValue(value) {
  return String(value).replace(/[\r\n\x00-\x1f\x7f]+/g, ' ').trim();
}

function formatMeta(meta) {
  if (!meta) return '';
  return ' ' + Object.entries(meta).map(([k, v]) => `${k}=${sanitizeLogValue(v)}`).join(' ');
}

export function createWebtopLogger({ env = process.env, sink = console, now = () => new Date(), prefix = 'Webtop' } = {}) {
  const line = (tag, msg, meta) => `[${prefix}] ${formatJerusalemTime(now())} ${tag} ${sanitizeLogValue(msg)}${formatMeta(meta)}`;
  // Level is read on every call so it can be changed in tests / at runtime.
  const isAll = () => getLogLevel(env, sink) === 'all';
  return {
    /** Routine information: only at level "all". */
    info(msg, meta) {
      if (isAll()) sink.log(line('INFO', msg, meta));
    },
    /** Non-auth failures / failed app logins: printed at both levels. */
    warn(msg, meta) {
      sink.warn(line('WARN', msg, meta));
    },
    /** Wrong password / lockout events: printed at both levels. */
    lockout(msg, meta) {
      sink.error(line('LOCKOUT', msg, meta));
    }
  };
}

export const createLogger = createWebtopLogger;
export const webtopLog = createWebtopLogger({ prefix: 'Webtop' });
export const appLog = createWebtopLogger({ prefix: 'App' });
