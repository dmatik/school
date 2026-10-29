export function isLoopbackOrIp(hostname) {
  if (!hostname) return true;
  if (['localhost', '127.0.0.1', '::1'].includes(hostname)) return true;
  // IPv4 pattern
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return true;
  // IPv6 pattern
  if (hostname.includes(':')) return true;
  return false;
}

export function getWebAuthnConfig(req) {
  const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://localhost:3001',
    'http://localhost:8080',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:8080',
  ]);

  if (process.env.EXPECTED_ORIGIN) {
    process.env.EXPECTED_ORIGIN.split(',').forEach(o => {
      const trimmed = o.trim();
      if (trimmed) allowedOrigins.add(trimmed);
    });
  }

  // Extract origin from request headers (Origin or Referer)
  const originHeader = req?.get ? (req.get('origin') || req.get('referer')) : (req?.headers?.origin || req?.headers?.referer);
  let parsedOrigin = null;
  if (originHeader) {
    try {
      parsedOrigin = new URL(originHeader);
      allowedOrigins.add(parsedOrigin.origin);
    } catch {
      // ignore invalid URL
    }
  }

  // Extract host & forwarded host
  const forwardedHostRaw = (req?.get ? req.get('x-forwarded-host') : req?.headers?.['x-forwarded-host'])?.split(',')[0]?.trim();
  const forwardedHostname = forwardedHostRaw ? forwardedHostRaw.split(':')[0].trim() : null;

  const hostRaw = (req?.get ? req.get('host') : req?.headers?.host) || '';
  const hostName = hostRaw ? hostRaw.split(':')[0].trim() : null;

  const proto = (req?.get ? req.get('x-forwarded-proto') : req?.headers?.['x-forwarded-proto']) || req?.protocol || 'http';

  if (forwardedHostRaw) {
    allowedOrigins.add(`${proto}://${forwardedHostRaw}`);
  }
  if (hostRaw) {
    allowedOrigins.add(`${proto}://${hostRaw}`);
  }

  // Determine RP ID (WebAuthn requires RP ID to be a valid domain, not an IP or localhost for non-local domains)
  let rpID = process.env.RP_ID;
  if (!rpID) {
    if (parsedOrigin?.hostname && !isLoopbackOrIp(parsedOrigin.hostname)) {
      rpID = parsedOrigin.hostname;
    } else if (forwardedHostname && !isLoopbackOrIp(forwardedHostname)) {
      rpID = forwardedHostname;
    } else if (hostName && !isLoopbackOrIp(hostName)) {
      rpID = hostName;
    } else if (process.env.EXPECTED_ORIGIN) {
      try {
        const firstOrigin = process.env.EXPECTED_ORIGIN.split(',')[0].trim();
        const originHost = new URL(firstOrigin).hostname;
        rpID = isLoopbackOrIp(originHost) ? 'localhost' : originHost;
      } catch {
        rpID = 'localhost';
      }
    } else {
      rpID = 'localhost';
    }
  }

  return { rpID, expectedOrigin: Array.from(allowedOrigins), rpName: 'School' };
}

