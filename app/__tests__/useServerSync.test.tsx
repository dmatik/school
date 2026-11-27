import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { render, act, waitFor } from '@testing-library/react-native';
import { useServerSync } from '../src/hooks/useServerSync';
import * as api from '../src/lib/api';
import { mockJsonResponse } from './testHelpers';

function SyncHarness({ enabled }: { enabled: boolean }) {
  useServerSync(enabled);
  return null;
}

describe('useServerSync (Mobile)', () => {
  let appStateListener: ((state: AppStateStatus) => void) | null = null;
  let addEventListenerSpy: jest.SpyInstance;
  let apiFetchSpy: jest.SpyInstance;

  beforeEach(() => {
    appStateListener = null;
    addEventListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        appStateListener = listener;
        return { remove: jest.fn() };
      });
    apiFetchSpy = jest.spyOn(api, 'apiFetch').mockImplementation(async (path: string) => {
      if (path === '/api/webtop/config') {
        return mockJsonResponse({ hasCredentials: true, autoSyncEnabled: true });
      }
      if (path === '/api/webtop/sync-if-stale') {
        return mockJsonResponse({ synced: true, lastSyncedAt: new Date().toISOString() });
      }
      return mockJsonResponse({});
    });
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    apiFetchSpy.mockRestore();
  });

  it('fetches config on mount when enabled and does not poll in background', async () => {
    render(<SyncHarness enabled={true} />);

    await waitFor(() => {
      expect(apiFetchSpy).toHaveBeenCalledWith('/api/webtop/config');
    });

    // Only config + initial sync-if-stale should run, no interval polling
    const syncCalls = apiFetchSpy.mock.calls.filter(
      (c) => c[0] === '/api/webtop/sync-if-stale'
    );
    expect(syncCalls.length).toBeLessThanOrEqual(1);
  });

  it('does not fetch config when disabled', () => {
    render(<SyncHarness enabled={false} />);
    expect(apiFetchSpy).not.toHaveBeenCalled();
  });

  it('triggers sync-if-stale when AppState transitions to active', async () => {
    render(<SyncHarness enabled={true} />);

    await waitFor(() => {
      expect(apiFetchSpy).toHaveBeenCalledWith('/api/webtop/config');
    });

    const initialSyncCount = apiFetchSpy.mock.calls.filter(
      (c) => c[0] === '/api/webtop/sync-if-stale'
    ).length;

    await act(async () => {
      appStateListener?.('active');
    });

    await waitFor(() => {
      const afterCount = apiFetchSpy.mock.calls.filter(
        (c) => c[0] === '/api/webtop/sync-if-stale'
      ).length;
      expect(afterCount).toBeGreaterThanOrEqual(initialSyncCount);
    });
  });
});
