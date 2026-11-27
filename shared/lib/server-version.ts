/**
 * Queries `/api/health` using the provided fetch-compatible function and extracts
 * the live server version string, or returns `null` when the server is older
 * (omits `version`), unreachable, or returns an invalid payload.
 */
export async function fetchHealthVersion(
  fetcher: (path: string, init?: RequestInit) => Promise<Response>
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetcher('/api/health', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as {
      status?: unknown;
      app?: unknown;
      version?: unknown;
    } | null;
    if (!data || data.status !== 'ok' || data.app !== 'school') {
      return null;
    }
    if (typeof data.version !== 'string') {
      return null;
    }
    const trimmed = data.version.trim();
    return trimmed || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
