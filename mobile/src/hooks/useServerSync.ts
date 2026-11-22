import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { apiFetch } from '../lib/api';

export interface WebtopSyncState {
  configured: boolean;
  lastSyncedAt: string | null;
  nextSyncAt: string | null;
  syncStatus: string;
  autoSyncAvailable: boolean;
  autoSyncEnabled: boolean;
  autoSyncPaused: boolean;
}

const INITIAL_WEBTOP_STATE: WebtopSyncState = {
  configured: false,
  lastSyncedAt: null,
  nextSyncAt: null,
  syncStatus: 'idle',
  autoSyncAvailable: false,
  autoSyncEnabled: false,
  autoSyncPaused: false,
};

const FOREGROUND_DEBOUNCE_MS = 1_500;
const STALE_CHECK_THROTTLE_MS = 5 * 60_000;

/**
 * Keeps the mobile client silently synchronized with our internal server on:
 * 1. App open (mount / login)
 * 2. Return from background (AppState -> 'active')
 * 3. Dock tab switch (via refreshConfig)
 *
 * No periodic background polling timers are used.
 * `lastSyncedAt` always reflects Webtop's last sync time.
 */
export function useServerSync(enabled: boolean) {
  const [webtopState, setWebtopState] = useState<WebtopSyncState>(INITIAL_WEBTOP_STATE);
  const [foregroundTrigger, setForegroundTrigger] = useState(0);

  const inFlightRef = useRef(false);
  const lastCheckAtRef = useRef(0);
  const lastStaleCheckAtRef = useRef(0);
  const appStateRef = useRef<AppStateStatus>((AppState.currentState as AppStateStatus) || 'active');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const maybeTriggerSyncIfStale = useCallback(async (cfg: WebtopSyncState) => {
    if (!cfg.configured || !cfg.autoSyncAvailable || !cfg.autoSyncEnabled) return;
    const now = Date.now();
    if (now - lastStaleCheckAtRef.current < STALE_CHECK_THROTTLE_MS) return;
    lastStaleCheckAtRef.current = now;

    try {
      const res = await apiFetch('/api/webtop/sync-if-stale', { method: 'POST' });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.skipped && mountedRef.current) {
        setForegroundTrigger((prev) => prev + 1);
        await refreshConfigRef.current(false);
      }
    } catch {
      // Silent: background stale check must never disturb the user
    }
  }, []);

  const refreshConfig = useCallback(
    async (triggerStaleCheck = false): Promise<WebtopSyncState | null> => {
      if (!enabled || inFlightRef.current) return null;
      inFlightRef.current = true;
      lastCheckAtRef.current = Date.now();

      try {
        const res = await apiFetch('/api/webtop/config');
        if (!res.ok || !mountedRef.current) return null;

        const data = await res.json();
        if (!mountedRef.current) return null;

        const nextState: WebtopSyncState = {
          configured: Boolean(data.configured),
          lastSyncedAt: data.configured ? (data.lastSyncedAt ?? null) : null,
          nextSyncAt: data.nextSyncAt ?? null,
          syncStatus: data.syncStatus || 'idle',
          autoSyncAvailable: Boolean(data.autoSyncAvailable),
          autoSyncEnabled: Boolean(data.autoSyncEnabled),
          autoSyncPaused: Boolean(data.autoSyncAvailable && data.autoSyncPaused),
        };

        setWebtopState((prev) => {
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

        if (triggerStaleCheck) {
          void maybeTriggerSyncIfStale(nextState);
        }
        return nextState;
      } catch {
        return null;
      } finally {
        inFlightRef.current = false;
      }
    },
    [enabled, maybeTriggerSyncIfStale]
  );

  const refreshConfigRef = useRef(refreshConfig);
  useEffect(() => {
    refreshConfigRef.current = refreshConfig;
  }, [refreshConfig]);

  // Case 1 (App Open) & Case 2 (Return from Background)
  useEffect(() => {
    if (!enabled) {
      lastStaleCheckAtRef.current = 0;
      setWebtopState(INITIAL_WEBTOP_STATE);
      setForegroundTrigger(0);
      return;
    }

    // Case 1: Unconditionally fetch Webtop config on app open so header lastSyncedAt always populates
    void refreshConfig(true);

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextAppState;

      // Case 2: Returning to foreground from background/inactive
      if (nextAppState === 'active' && prevState !== 'active') {
        const now = Date.now();
        if (now - lastCheckAtRef.current >= FOREGROUND_DEBOUNCE_MS) {
          setForegroundTrigger((prev) => prev + 1);
          void refreshConfig(true);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [enabled, refreshConfig]);

  return {
    webtopState,
    foregroundTrigger,
    refreshConfig,
  };
}
