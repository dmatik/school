import React from 'react';
import { Dimensions } from 'react-native';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import { TestProviders, mockJsonResponse } from './testHelpers';
import { HomeworkScreen } from '../src/screens/HomeworkScreen';
import { IncidentsScreen } from '../src/screens/IncidentsScreen';
import { SettingsScreen } from '../src/screens/SettingsScreen';
import { AccountScreen } from '../src/screens/AccountScreen';
import { AdminScreen } from '../src/screens/AdminScreen';
import * as api from '../src/lib/api';
import type { User, WebtopConfig, HomeworkItem, Incident } from '../../src/types';

const parentUser: User = {
  id: 'u-parent',
  username: 'parent1',
  firstName: 'Dana',
  lastName: 'Cohen',
  role: 'user',
  familyRole: 'parent',
};

const childUser: User = {
  id: 'u-child',
  username: 'noa',
  firstName: 'Noa',
  lastName: 'Cohen',
  role: 'user',
  familyRole: 'child',
  linkedChildId: 'c1',
};

const adminUser: User = {
  id: 'u-admin',
  username: 'admin',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin',
  familyRole: 'parent',
};

const sampleConfig: WebtopConfig = {
  configured: true,
  username: 'webtop-user',
  selectedChildId: null,
  autoSyncEnabled: true,
  lastSyncedAt: '2026-04-06T08:00:00',
  syncStatus: 'idle',
  syncError: null,
  linkedChildren: [
    {
      id: 'c1',
      firstName: 'נועה',
      lastName: 'כהן',
      classCode: 4,
      classNum: 2,
      color: 'blue',
    },
    {
      id: 'c2',
      firstName: 'יואב',
      lastName: 'כהן',
      classCode: 6,
      classNum: 1,
      color: 'emerald',
    },
  ],
};

const sampleHomework: HomeworkItem[] = [
  {
    id: 'hw-1',
    studentId: 's1',
    studentName: 'נועה כהן',
    childId: 'c1',
    subject: 'מתמטיקה',
    teacher: 'רונית',
    dueDate: '2026-04-06',
    hourNum: 2,
    description: 'עמוד 14 תרגיל 1',
    lessonSubject: 'שברים',
    completed: false,
    rawData: JSON.stringify({ homeWork: 'עמוד 14 תרגיל 1' }),
  },
  {
    id: 'hw-2',
    studentId: 's2',
    studentName: 'יואב כהן',
    childId: 'c2',
    subject: 'אנגלית',
    teacher: 'דנה',
    dueDate: '2026-04-06',
    hourNum: 3,
    description: 'Read page 8',
    lessonSubject: 'Reading',
    completed: false,
    rawData: JSON.stringify({ homeWork: 'Read page 8' }),
  },
];

const sampleIncidents: Incident[] = [
  {
    id: 'inc-1',
    studentId: 's1',
    studentName: 'נועה כהן',
    childId: 'c1',
    date: '2026-04-06',
    type: 'איחור',
    description: 'איחור של 5 דקות',
    subject: 'היסטוריה',
    teacher: 'משה',
    hourNum: 1,
    isJustified: false,
  },
  {
    id: 'inc-2',
    studentId: 's2',
    studentName: 'יואב כהן',
    childId: 'c2',
    date: '2026-04-06',
    type: 'חיסור',
    description: 'היעדרות מוצדקת',
    subject: 'מדעים',
    teacher: 'יעל',
    hourNum: 2,
    isJustified: true,
  },
];

describe('Mobile & Web Application Screens', () => {
  let apiFetchSpy: jest.SpyInstance;

  beforeEach(() => {
    act(() => {
      Dimensions.set({
        window: { width: 390, height: 844, scale: 1, fontScale: 1 },
        screen: { width: 390, height: 844, scale: 1, fontScale: 1 },
      });
    });

    apiFetchSpy = jest.spyOn(api, 'apiFetch').mockImplementation(async (path: string, opts?: any) => {
      if (path === '/api/webtop/config') return mockJsonResponse(sampleConfig);
      if (path.startsWith('/api/homework')) return mockJsonResponse(sampleHomework);
      if (path.startsWith('/api/incidents')) return mockJsonResponse(sampleIncidents);
      if (path === '/api/passkeys') return mockJsonResponse([]);
      if (path === '/api/admin/users') return mockJsonResponse([parentUser, adminUser]);
      if (path === '/api/webtop/sync' && opts?.method === 'POST') {
        return mockJsonResponse({ synced: true, lastSyncedAt: '2026-04-06T10:00:00' });
      }
      if (path === '/api/webtop/auto-sync' && opts?.method === 'PUT') {
        return mockJsonResponse({ autoSyncEnabled: false });
      }
      if (path === '/api/auth/profile' && opts?.method === 'PUT') {
        return mockJsonResponse({ ...parentUser, firstName: 'Dina' });
      }
      return mockJsonResponse({});
    });
  });

  afterEach(() => {
    apiFetchSpy.mockRestore();
  });

  describe('HomeworkScreen', () => {
    it('renders homework items and filters by search query and child tab', async () => {
      const { getByText, getByRole, queryByText, getByPlaceholderText } = render(
        <TestProviders>
          <HomeworkScreen currentUser={parentUser} syncTrigger={0} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(getByText('מתמטיקה')).toBeTruthy();
        expect(getByText('אנגלית')).toBeTruthy();
      });

      fireEvent.press(getByRole('tab', { name: 'נועה' }));

      await waitFor(() => {
        expect(getByText('מתמטיקה')).toBeTruthy();
        expect(queryByText('אנגלית')).toBeNull();
      });

      fireEvent.press(getByRole('tab', { name: 'הכל' }));
      fireEvent.changeText(getByPlaceholderText(/חיפוש|search/i), 'אנגלית');

      await waitFor(() => {
        expect(getByText('אנגלית')).toBeTruthy();
        expect(queryByText('מתמטיקה')).toBeNull();
      });
    });

    it('renders empty state when homework list is empty', async () => {
      apiFetchSpy.mockImplementation(async (path: string) => {
        if (path === '/api/webtop/config') return mockJsonResponse(sampleConfig);
        if (path.startsWith('/api/homework')) return mockJsonResponse([]);
        return mockJsonResponse({});
      });

      const { getByText } = render(
        <TestProviders>
          <HomeworkScreen currentUser={parentUser} syncTrigger={0} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(getByText(/אין שיעורי בית|no homework/i)).toBeTruthy();
      });
    });
  });

  describe('IncidentsScreen', () => {
    it('renders incidents and filters by child tab and search query', async () => {
      const { getByText, getByRole, queryByText, getByPlaceholderText } = render(
        <TestProviders>
          <IncidentsScreen currentUser={parentUser} syncTrigger={0} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(getByText('היסטוריה')).toBeTruthy();
        expect(getByText('מדעים')).toBeTruthy();
      });

      fireEvent.press(getByRole('tab', { name: 'יואב' }));

      await waitFor(() => {
        expect(getByText('מדעים')).toBeTruthy();
        expect(queryByText('היסטוריה')).toBeNull();
      });

      fireEvent.press(getByRole('tab', { name: 'הכל' }));
      fireEvent.changeText(getByPlaceholderText(/חיפוש|search/i), '5 דקות');

      await waitFor(() => {
        expect(getByText('היסטוריה')).toBeTruthy();
        expect(queryByText('מדעים')).toBeNull();
      });
    });

    it('renders empty state when incidents list is empty', async () => {
      apiFetchSpy.mockImplementation(async (path: string) => {
        if (path === '/api/webtop/config') return mockJsonResponse(sampleConfig);
        if (path.startsWith('/api/incidents')) return mockJsonResponse([]);
        return mockJsonResponse({});
      });

      const { getByText } = render(
        <TestProviders>
          <IncidentsScreen currentUser={parentUser} syncTrigger={0} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(getByText(/אין אירועים|no incidents/i)).toBeTruthy();
      });
    });
  });

  describe('SettingsScreen', () => {
    it('renders Webtop config, linked children, and triggers manual sync', async () => {
      const onSyncCompleted = jest.fn();
      const { getByText } = render(
        <TestProviders>
          <SettingsScreen
            currentUser={parentUser}
            syncTrigger={0}
            onSyncCompleted={onSyncCompleted}
          />
        </TestProviders>
      );

      await waitFor(() => {
        expect(getByText(/נועה כהן/)).toBeTruthy();
        expect(getByText(/יואב כהן/)).toBeTruthy();
      });

      fireEvent.press(getByText(/סנכרן עכשיו|sync now|סנכרן/i));

      await waitFor(() => {
        expect(apiFetchSpy).toHaveBeenCalledWith(
          '/api/webtop/sync',
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('hides Webtop integration card for child accounts', async () => {
      const { queryByTestId } = render(
        <TestProviders>
          <SettingsScreen
            currentUser={childUser}
            syncTrigger={0}
            onSyncCompleted={jest.fn()}
          />
        </TestProviders>
      );

      await waitFor(() => {
        expect(queryByTestId('settings-webtop-card')).toBeNull();
      });
    });
  });

  describe('AccountScreen', () => {
    it('renders profile inputs, updates profile via PUT /api/auth/profile, and triggers logout', async () => {
      const onLogout = jest.fn();
      const onUserUpdated = jest.fn();
      const { getByDisplayValue, getByTestId, getAllByText } = render(
        <TestProviders>
          <AccountScreen
            currentUser={parentUser}
            onUserUpdated={onUserUpdated}
            onLogout={onLogout}
          />
        </TestProviders>
      );

      await waitFor(() => {
        expect(getByDisplayValue('Dana')).toBeTruthy();
        expect(getByDisplayValue('Cohen')).toBeTruthy();
      });

      fireEvent.changeText(getByDisplayValue('Dana'), 'Dina');
      fireEvent.press(getAllByText(/שמירה|save/i)[0]);

      await waitFor(() => {
        expect(apiFetchSpy).toHaveBeenCalledWith(
          '/api/auth/profile',
          expect.objectContaining({ method: 'PUT' })
        );
      });

      fireEvent.press(getByTestId('logout-button'));
      expect(onLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('AdminScreen', () => {
    it('renders user list, filters by search, and opens add-user modal', async () => {
      const { getByText, queryByText, getByTestId } = render(
        <TestProviders>
          <AdminScreen currentUser={adminUser} syncTrigger={0} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(getByText(/Dana Cohen/)).toBeTruthy();
        expect(getByText(/Admin User/)).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('admin-search-input'), 'Dana');

      await waitFor(() => {
        expect(getByText(/Dana Cohen/)).toBeTruthy();
        expect(queryByText(/Admin User/)).toBeNull();
      });

      fireEvent.changeText(getByTestId('admin-search-input'), '');
      fireEvent.press(getByTestId('add-user-fab'));

      await waitFor(() => {
        expect(getByText(/שם משתמש|username/i)).toBeTruthy();
      });
    });
  });
});
