import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useServerSync } from '@/hooks/useServerSync'

function mockConfigResponse(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    json: async () => ({
      configured: true,
      lastSyncedAt: '2026-11-22T05:00:00.000Z',
      nextSyncAt: null,
      syncStatus: 'success',
      autoSyncAvailable: false,
      autoSyncEnabled: false,
      autoSyncPaused: false,
      ...overrides,
    }),
  } as Response
}

describe('useServerSync (event-driven, no periodic polling)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('fetches /api/webtop/config on app open and does NOT poll periodically while idle', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(mockConfigResponse())

    const { result } = renderHook(() => useServerSync('test-token'))

    await act(async () => {
      await Promise.resolve()
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/webtop/config', expect.any(Object))
    expect(result.current.webtopState.lastSyncedAt).toBe('2026-11-22T05:00:00.000Z')
    expect(result.current.foregroundTrigger).toBe(0)

    // Advance 5 minutes while tab stays open — zero periodic polling requests
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60_000)
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.current.foregroundTrigger).toBe(0)
  })

  it('refreshes config and increments foregroundTrigger when returning from background', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(mockConfigResponse())
      .mockResolvedValueOnce(
        mockConfigResponse({ lastSyncedAt: '2026-11-22T08:15:00.000Z' })
      )

    const { result } = renderHook(() => useServerSync('test-token'))

    await act(async () => {
      await Promise.resolve()
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.current.foregroundTrigger).toBe(0)

    // Simulate leaving and returning after 2 seconds
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000)
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      })
      document.dispatchEvent(new Event('visibilitychange'))

      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      })
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.current.foregroundTrigger).toBe(1)
    expect(result.current.webtopState.lastSyncedAt).toBe('2026-11-22T08:15:00.000Z')
  })

  it('triggers sync-if-stale only when autoSyncAvailable and autoSyncEnabled, and throttles it', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url === '/api/webtop/sync-if-stale') {
        return {
          ok: true,
          json: async () => ({ skipped: true, reason: 'fresh' }),
        } as Response
      }
      return mockConfigResponse({
        autoSyncAvailable: true,
        autoSyncEnabled: true,
      })
    })

    renderHook(() => useServerSync('test-token'))

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const staleCallsAfterMount = fetchMock.mock.calls.filter(
      ([url]) => url === '/api/webtop/sync-if-stale'
    ).length
    expect(staleCallsAfterMount).toBe(1)

    // Focus 2 seconds later -> refreshes config, but does NOT call sync-if-stale again (5-min throttle)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000)
      window.dispatchEvent(new Event('focus'))
      await Promise.resolve()
    })

    const staleCallsAfterFocus = fetchMock.mock.calls.filter(
      ([url]) => url === '/api/webtop/sync-if-stale'
    ).length
    expect(staleCallsAfterFocus).toBe(1)
  })
})
