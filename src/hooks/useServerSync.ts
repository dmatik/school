import { useState, useEffect, useRef, useCallback } from 'react'

export interface WebtopSyncState {
  configured: boolean
  lastSyncedAt: string | null
  nextSyncAt: string | null
  syncStatus: string
  autoSyncAvailable: boolean
  autoSyncEnabled: boolean
  autoSyncPaused: boolean
}

const INITIAL_WEBTOP_STATE: WebtopSyncState = {
  configured: false,
  lastSyncedAt: null,
  nextSyncAt: null,
  syncStatus: 'idle',
  autoSyncAvailable: false,
  autoSyncEnabled: false,
  autoSyncPaused: false,
}

const FOCUS_DEBOUNCE_MS = 1_500
const STALE_CHECK_THROTTLE_MS = 5 * 60_000

/**
 * Keeps the web client silently synchronized with our internal server on:
 * 1. App open (mount / login)
 * 2. Return from background (visibilitychange -> visible / window focus / online)
 * 3. Navigation page switch (via refreshConfig)
 *
 * No periodic background polling timers are used.
 * `lastSyncedAt` always reflects Webtop's last sync time.
 */
export function useServerSync(token: string | null) {
  const [webtopState, setWebtopState] = useState<WebtopSyncState>(INITIAL_WEBTOP_STATE)
  const [foregroundTrigger, setForegroundTrigger] = useState(0)

  const inFlightRef = useRef(false)
  const lastCheckAtRef = useRef(0)
  const lastStaleCheckAtRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const maybeTriggerSyncIfStale = useCallback(async (authToken: string, cfg: WebtopSyncState) => {
    if (!cfg.configured || !cfg.autoSyncAvailable || !cfg.autoSyncEnabled) return
    const now = Date.now()
    if (now - lastStaleCheckAtRef.current < STALE_CHECK_THROTTLE_MS) return
    lastStaleCheckAtRef.current = now

    try {
      const res = await fetch('/api/webtop/sync-if-stale', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (!res.ok) return
      const data = await res.json()
      if (!data.skipped && mountedRef.current) {
        setForegroundTrigger(prev => prev + 1)
        await refreshConfigRef.current(false)
      }
    } catch {
      // Silent: background stale check must never disturb the user
    }
  }, [])

  const refreshConfig = useCallback(async (triggerStaleCheck = false): Promise<WebtopSyncState | null> => {
    if (!token || inFlightRef.current) return null
    inFlightRef.current = true
    lastCheckAtRef.current = Date.now()

    try {
      const res = await fetch('/api/webtop/config', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok || !mountedRef.current) return null

      const data = await res.json()
      if (!mountedRef.current) return null

      const nextState: WebtopSyncState = {
        configured: Boolean(data.configured),
        lastSyncedAt: data.configured ? (data.lastSyncedAt ?? null) : null,
        nextSyncAt: data.nextSyncAt ?? null,
        syncStatus: data.syncStatus || 'idle',
        autoSyncAvailable: Boolean(data.autoSyncAvailable),
        autoSyncEnabled: Boolean(data.autoSyncEnabled),
        autoSyncPaused: Boolean(data.autoSyncAvailable && data.autoSyncPaused),
      }

      setWebtopState(prev => {
        if (
          prev.configured === nextState.configured &&
          prev.lastSyncedAt === nextState.lastSyncedAt &&
          prev.nextSyncAt === nextState.nextSyncAt &&
          prev.syncStatus === nextState.syncStatus &&
          prev.autoSyncAvailable === nextState.autoSyncAvailable &&
          prev.autoSyncEnabled === nextState.autoSyncEnabled &&
          prev.autoSyncPaused === nextState.autoSyncPaused
        ) {
          return prev
        }
        return nextState
      })

      if (triggerStaleCheck) {
        void maybeTriggerSyncIfStale(token, nextState)
      }
      return nextState
    } catch {
      return null
    } finally {
      inFlightRef.current = false
    }
  }, [token, maybeTriggerSyncIfStale])

  const refreshConfigRef = useRef(refreshConfig)
  useEffect(() => {
    refreshConfigRef.current = refreshConfig
  }, [refreshConfig])

  // Case 1 (App Open) & Case 2 (Return from Background)
  useEffect(() => {
    if (!token) {
      lastStaleCheckAtRef.current = 0
      setWebtopState(INITIAL_WEBTOP_STATE)
      setForegroundTrigger(0)
      return
    }

    // Case 1: App opened -> fetch Webtop config + throttled sync-if-stale
    void refreshConfig(true)

    const handleReturnFromBackground = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastCheckAtRef.current < FOCUS_DEBOUNCE_MS) return
      setForegroundTrigger(prev => prev + 1)
      void refreshConfig(true)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleReturnFromBackground()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleReturnFromBackground)
    window.addEventListener('online', handleReturnFromBackground)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleReturnFromBackground)
      window.removeEventListener('online', handleReturnFromBackground)
    }
  }, [token, refreshConfig])

  return {
    webtopState,
    foregroundTrigger,
    refreshConfig,
  }
}
