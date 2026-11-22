import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useServerSync } from '@/hooks/useServerSync'

function mockSyncResponse(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    json: async () => ({
      version: 1,
      serverEpoch: 'epoch-1',
      domains: { homework: 1, incidents: 1, exams: 1, schedule: 1, config: 1 },
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

describe('useServerSync', () => {
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

  it('establishes baseline on mount without bumping domainVersions, then bumps only changed domains', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(mockSyncResponse())
      .mockResolvedValueOnce(
        mockSyncResponse({
          version: 2,
          domains: { homework: 2, incidents: 1, exams: 1, schedule: 1, config: 1 },
        })
      )

    const { result } = renderHook(() => useServerSync('test-token', 30_000))

    await act(async () => {
      await Promise.resolve()
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.current.syncState.configured).toBe(true)
    expect(result.current.domainVersions).toEqual({
      homework: 0,
      incidents: 0,
      exams: 0,
      schedule: 0,
      config: 0,
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.current.domainVersions).toEqual({
      homework: 1,
      incidents: 0,
      exams: 0,
      schedule: 0,
      config: 0,
    })
  })

  it('pauses polling when hidden and checks immediately on return to visible', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(mockSyncResponse())

    renderHook(() => useServerSync('test-token', 30_000))

    await act(async () => {
      await Promise.resolve()
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Hide tab -> polling stops
    await act(async () => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      })
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(90_000)
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Return to visible -> immediate check
    await act(async () => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      })
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
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
      return mockSyncResponse({
        autoSyncAvailable: true,
        autoSyncEnabled: true,
      })
    })

    renderHook(() => useServerSync('test-token', 30_000))

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const staleCallsAfterMount = fetchMock.mock.calls.filter(
      ([url]) => url === '/api/webtop/sync-if-stale'
    ).length
    expect(staleCallsAfterMount).toBe(1)

    // Focus 2 seconds later -> should check /api/sync/state but NOT call sync-if-stale again (5-min throttle)
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
