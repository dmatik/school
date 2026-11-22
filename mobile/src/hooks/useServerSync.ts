import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { apiFetch } from '../lib/api';

export type SyncDomain = 'homework' | 'incidents' | 'exams' | 'schedule' | 'config';
export type DomainVersions = Record<SyncDomain, number>;

export interface ServerSyncState {
  configured: boolean;
  lastSyncedAt: string | null;
  nextSyncAt: string | null;
  syncStatus: string;
  autoSyncAvailable: boolean;
  autoSyncEnabled: boolean;
  autoSyncPaused: boolean;
}

interface SyncStateApiResponse extends ServerSyncState {
  version: number;
  serverEpoch: string;
  domains: DomainVersions;
}

const INITIAL_SYNC_STATE: ServerSyncState = {
  configured: false,
  lastSyncedAt: null,
  nextSyncAt: null,
  syncStatus: 'idle',
  autoSyncAvailable: false,
  autoSyncEnabled: false,
  autoSyncPaused: false,
};

const INITIAL_DOMAIN_VERSIONS: DomainVersions = {
  homework: 0,
  incidents: 0,
  exams: 0,
  schedule: 0,
  config: 0,
};

const DOMAINS: SyncDomain[] = ['homework', 'incidents', 'exams', 'schedule', 'config'];
const DEFAULT_POLL_INTERVAL_MS = 30_000;
const FOREGROUND_DEBOUNCE_MS = 1_500;
const STALE_CHECK_THROTTLE_MS = 5 * 60_000;
const MAX_NEXT_SYNC_TIMER_MS = 2 * 60 * 60_000;

/**
 * Keeps the mobile client silently synchronized with our server's latest state.
 * - Checks immediately when the app returns to foreground ('active').
 * - Polls GET /api/sync/state every 30s while the app is active.
 * - Pauses all timers when backgrounded or inactive.
 * - Bumps only the domainVersions that changed on the server.
 */
export function useServerSync(
  enabled: boolean,
  pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS
) {
  const [syncState, setSyncState] = useState<ServerSyncState>(INITIAL_SYNC_STATE);
  const [domainVersions, setDomainVersions] = useState<DomainVersions>(INITIAL_DOMAIN_VERSIONS);

  const serverEpochRef = useRef<string | null>(null);
  const serverDomainsRef = useRef<DomainVersions | null>(null);
  const inFlightRef = useRef(false);
  const lastCheckAtRef = useRef(0);
  const lastStaleCheckAtRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>((AppState.currentState as AppStateStatus) || 'active');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearTimers = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (nextSyncTimerRef.current) {
      clearTimeout(nextSyncTimerRef.current);
      nextSyncTimerRef.current = null;
    }
  }, []);

  const maybeTriggerSyncIfStale = useCallback(async (cfg: ServerSyncState) => {
    if (!cfg.configured || !cfg.autoSyncAvailable || !cfg.autoSyncEnabled) return;
    const now = Date.now();
    if (now - lastStaleCheckAtRef.current < STALE_CHECK_THROTTLE_MS) return;
    lastStaleCheckAtRef.current = now;

    try {
      const res = await apiFetch('/api/webtop/sync-if-stale', { method: 'POST' });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.skipped && mountedRef.current) {
        lastCheckAtRef.current = 0;
        await checkNowRef.current(true);
      }
    } catch {
      // Silent: background stale check must never disturb the user
    }
  }, []);

  const checkNow = useCallback(
    async (triggerStaleCheck = false): Promise<ServerSyncState | null> => {
      if (!enabled || inFlightRef.current) return null;
      inFlightRef.current = true;
      lastCheckAtRef.current = Date.now();

      try {
        const res = await apiFetch('/api/sync/state');
        if (!res.ok || !mountedRef.current) return null;

        const data: SyncStateApiResponse = await res.json();
        if (!mountedRef.current) return null;

        const nextState: ServerSyncState = {
          configured: Boolean(data.configured),
          lastSyncedAt: data.configured ? (data.lastSyncedAt ?? null) : null,
          nextSyncAt: data.nextSyncAt ?? null,
          syncStatus: data.syncStatus || 'idle',
          autoSyncAvailable: Boolean(data.autoSyncAvailable),
          autoSyncEnabled: Boolean(data.autoSyncEnabled),
          autoSyncPaused: Boolean(data.autoSyncAvailable && data.autoSyncPaused),
        };

        setSyncState((prev) => {
          if (
            prev.configured === nextState.configured &&
            prev.lastSyncedAt === nextState.lastSyncedAt &&
            prev.nextSyncAt === nextState.nextSyncAt &&
            prev.syncStatus === nextState.syncStatus &&
            prev.autoSyncAvailable === nextState.autoSyncAvailable &&
            prev.autoSyncEnabled === nextState.autoSyncEnabled &&
            prev.autoSyncPaused === nextState.autoSyncPaused
          ) {
            return prev;
          }
          return nextState;
        });

        if (data.domains && data.serverEpoch) {
          const prevEpoch = serverEpochRef.current;
          const prevDomains = serverDomainsRef.current;

          if (!prevEpoch || !prevDomains) {
            serverEpochRef.current = data.serverEpoch;
            serverDomainsRef.current = { ...data.domains };
          } else {
            const epochChanged = prevEpoch !== data.serverEpoch;
            const changedDomains = DOMAINS.filter(
              (d) => epochChanged || data.domains[d] !== prevDomains[d]
            );

            serverEpochRef.current = data.serverEpoch;
            serverDomainsRef.current = { ...data.domains };

            if (changedDomains.length > 0) {
              setDomainVersions((prev) => {
                const updated = { ...prev };
                for (const d of changedDomains) {
                  updated[d] = prev[d] + 1;
                }
                return updated;
              });
            }
          }
        }

        if (triggerStaleCheck) {
          void maybeTriggerSyncIfStale(nextState);
        }
        return nextState;
      } catch {
        // Silent: background check must never disturb the user
        return null;
      } finally {
        inFlightRef.current = false;
      }
    },
    [enabled, maybeTriggerSyncIfStale]
  );

  const checkNowRef = useRef(checkNow);
  useEffect(() => {
    checkNowRef.current = checkNow;
  }, [checkNow]);

  const startPolling = useCallback(() => {
    clearTimers();
    if (!enabled || appStateRef.current !== 'active') return;
    pollTimerRef.current = setInterval(() => {
      void checkNowRef.current(false);
    }, pollIntervalMs);
  }, [enabled, pollIntervalMs, clearTimers]);

  // Schedule a one-shot check ~10s after the server's next scheduled Webtop sync
  useEffect(() => {
    if (nextSyncTimerRef.current) {
      clearTimeout(nextSyncTimerRef.current);
      nextSyncTimerRef.current = null;
    }
    if (!enabled || !syncState.nextSyncAt || !syncState.autoSyncEnabled) return;
    if (appStateRef.current !== 'active') return;

    const targetMs = new Date(syncState.nextSyncAt).getTime() + 10_000;
    const delayMs = targetMs - Date.now();
    if (delayMs > 0 && delayMs <= MAX_NEXT_SYNC_TIMER_MS) {
      nextSyncTimerRef.current = setTimeout(() => {
        void checkNowRef.current(false);
      }, delayMs);
    }

    return () => {
      if (nextSyncTimerRef.current) {
        clearTimeout(nextSyncTimerRef.current);
        nextSyncTimerRef.current = null;
      }
    };
  }, [enabled, syncState.nextSyncAt, syncState.autoSyncEnabled]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      serverEpochRef.current = null;
      serverDomainsRef.current = null;
      lastStaleCheckAtRef.current = 0;
      setSyncState(INITIAL_SYNC_STATE);
      setDomainVersions(INITIAL_DOMAIN_VERSIONS);
      return;
    }

    if (appStateRef.current === 'active') {
      void checkNow(true);
      startPolling();
    }

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (nextAppState === 'active' && prevState !== 'active') {
        const now = Date.now();
        if (now - lastCheckAtRef.current >= FOREGROUND_DEBOUNCE_MS) {
          void checkNow(true);
        }
        startPolling();
      } else if (nextAppState !== 'active') {
        clearTimers();
      }
    });

    return () => {
      clearTimers();
      subscription.remove();
    };
  }, [enabled, checkNow, startPolling, clearTimers]);

  return {
    syncState,
    domainVersions,
    checkNow,
  };
}
