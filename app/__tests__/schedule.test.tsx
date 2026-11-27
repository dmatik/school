import React from 'react';
import { Dimensions } from 'react-native';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import { TestProviders, mockJsonResponse } from './testHelpers';
import { ScheduleScreen } from '../src/screens/ScheduleScreen';
import * as api from '../src/lib/api';
import * as schedulePdf from '../src/lib/schedulePdf';
import type { User, WebtopConfig } from '../../shared/types';

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

const multiChildConfig: WebtopConfig = {
  configured: true,
  username: 'webtop-user',
  selectedChildId: null,
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

const sampleScheduleC1 = {
  lessons: [
    {
      id: 'l1',
      childId: 'c1',
      dayOfWeek: 0,
      hourNum: 1,
      subject: 'מתמטיקה',
      teacher: 'רונית',
    },
    {
      id: 'l2',
      childId: 'c1',
      dayOfWeek: 1,
      hourNum: 2,
      subject: 'מדעים',
      teacher: 'יגאל',
    },
  ],
  finishTimes: [{ id: 'ft-1', childId: 'c1', dayOfWeek: 0, finishTime: '13:30' }],
};

const sampleScheduleC2 = {
  lessons: [
    {
      id: 'l3',
      childId: 'c2',
      dayOfWeek: 0,
      hourNum: 1,
      subject: 'היסטוריה',
      teacher: 'משה',
    },
  ],
  finishTimes: [{ id: 'ft-2', childId: 'c2', dayOfWeek: 0, finishTime: '14:15' }],
};

describe('ScheduleScreen', () => {
  let apiFetchSpy: jest.SpyInstance;
  let sharePdfSpy: jest.SpyInstance;

  beforeEach(() => {
    apiFetchSpy = jest.spyOn(api, 'apiFetch').mockImplementation(async (path: string, opts?: any) => {
      if (path === '/api/webtop/config') return mockJsonResponse(multiChildConfig);
      if (path === '/api/schedule?childId=c1') return mockJsonResponse(sampleScheduleC1);
      if (path === '/api/schedule?childId=c2') return mockJsonResponse(sampleScheduleC2);
      if (path === '/api/schedule/lesson' && opts?.method === 'PUT') {
        return mockJsonResponse({
          id: 'l1',
          childId: 'c1',
          dayOfWeek: 0,
          hourNum: 1,
          subject: 'גיאומטריה',
          teacher: 'רונית',
        });
      }
      if (path.startsWith('/api/schedule/lesson/') && opts?.method === 'DELETE') {
        return mockJsonResponse({ deleted: true });
      }
      if (path === '/api/schedule/finish-time' && opts?.method === 'PUT') {
        return mockJsonResponse({
          id: 'ft-1',
          childId: 'c1',
          dayOfWeek: 0,
          finishTime: '14:00',
        });
      }
      return mockJsonResponse({});
    });
    sharePdfSpy = jest
      .spyOn(schedulePdf, 'shareSchedulePdfMobile')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => {
      Dimensions.set({
        window: { width: 390, height: 844, scale: 1, fontScale: 1 },
        screen: { width: 390, height: 844, scale: 1, fontScale: 1 },
      });
    });
    apiFetchSpy.mockRestore();
    sharePdfSpy.mockRestore();
  });

  it('loads and renders schedule lessons and finish times', async () => {
    const { getByText } = render(
      <TestProviders>
        <ScheduleScreen currentUser={parentUser} syncTrigger={0} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(getByText('מתמטיקה')).toBeTruthy();
      expect(getByText('מדעים')).toBeTruthy();
      expect(getByText('13:30')).toBeTruthy();
    });
  });

  it('switches between linked children and loads the selected child schedule', async () => {
    const { getByText } = render(
      <TestProviders>
        <ScheduleScreen currentUser={parentUser} syncTrigger={0} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(getByText('מתמטיקה')).toBeTruthy();
    });

    fireEvent.press(getByText('יואב'));

    await waitFor(() => {
      expect(apiFetchSpy).toHaveBeenCalledWith('/api/schedule?childId=c2');
      expect(getByText('היסטוריה')).toBeTruthy();
      expect(getByText('14:15')).toBeTruthy();
    });
  });

  it('calls shareSchedulePdfMobile with child schedule data when share button is pressed', async () => {
    const { getByTestId } = render(
      <TestProviders>
        <ScheduleScreen currentUser={parentUser} syncTrigger={0} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(getByTestId('schedule-share-btn')).toBeTruthy();
    });

    fireEvent.press(getByTestId('schedule-share-btn'));

    await waitFor(() => {
      expect(sharePdfSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('hides edit button for child accounts', async () => {
    const { queryByLabelText, getByText } = render(
      <TestProviders>
        <ScheduleScreen currentUser={childUser} syncTrigger={0} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(getByText('מתמטיקה')).toBeTruthy();
    });

    expect(queryByLabelText(/עריכת מערכת|edit schedule/i)).toBeNull();
  });

  it('enters edit mode, edits a lesson cell, and saves via PUT /api/schedule/lesson', async () => {
    const { getByTestId, getByText, getByDisplayValue } = render(
      <TestProviders>
        <ScheduleScreen currentUser={parentUser} syncTrigger={0} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(getByText('מתמטיקה')).toBeTruthy();
    });

    fireEvent.press(getByTestId('schedule-edit-fab'));
    fireEvent.press(getByText('מתמטיקה'));

    await waitFor(() => {
      expect(getByDisplayValue('מתמטיקה')).toBeTruthy();
    });

    fireEvent.changeText(getByDisplayValue('מתמטיקה'), 'גיאומטריה');
    fireEvent.press(getByText('שמירה'));

    await waitFor(() => {
      expect(apiFetchSpy).toHaveBeenCalledWith(
        '/api/schedule/lesson',
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  it('clears a lesson from the edit modal via PUT /api/schedule/lesson', async () => {
    const { getByTestId, getByText } = render(
      <TestProviders>
        <ScheduleScreen currentUser={parentUser} syncTrigger={0} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(getByText('מתמטיקה')).toBeTruthy();
    });

    fireEvent.press(getByTestId('schedule-edit-fab'));
    fireEvent.press(getByText('מתמטיקה'));

    await waitFor(() => {
      expect(getByText('מחק שיעור')).toBeTruthy();
    });

    fireEvent.press(getByText('מחק שיעור'));

    await waitFor(() => {
      expect(apiFetchSpy).toHaveBeenCalledWith(
        '/api/schedule/lesson',
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  it('edits finish time in edit mode via PUT /api/schedule/finish-time', async () => {
    const { getByTestId, getByText } = render(
      <TestProviders>
        <ScheduleScreen currentUser={parentUser} syncTrigger={0} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(getByText('13:30')).toBeTruthy();
    });

    fireEvent.press(getByTestId('schedule-edit-fab'));
    fireEvent.press(getByText('13:30'));

    await waitFor(() => {
      expect(getByText('15:00')).toBeTruthy();
    });

    fireEvent.press(getByText('15:00'));
    fireEvent.press(getByText('שמירה'));

    await waitFor(() => {
      expect(apiFetchSpy).toHaveBeenCalledWith(
        '/api/schedule/finish-time',
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  it('shows loading indicator initially while schedule config is pending', () => {
    apiFetchSpy.mockImplementation(async () => new Promise(() => {}));

    const { UNSAFE_getByType } = render(
      <TestProviders>
        <ScheduleScreen currentUser={parentUser} syncTrigger={0} />
      </TestProviders>
    );

    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('renders desktop PageHeader when viewport width >= 768', async () => {
    act(() => {
      Dimensions.set({
        window: { width: 1280, height: 800, scale: 1, fontScale: 1 },
        screen: { width: 1280, height: 800, scale: 1, fontScale: 1 },
      });
    });

    const { getByTestId } = render(
      <TestProviders>
        <ScheduleScreen currentUser={parentUser} syncTrigger={0} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(getByTestId('desktop-page-header')).toBeTruthy();
    });
  });
});
