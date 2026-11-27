import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { TestProviders, mockJsonResponse } from './testHelpers';
import { ExamsScreen } from '../src/screens/ExamsScreen';
import * as api from '../src/lib/api';
import type { User, WebtopConfig, ExamItem } from '../../src/types';

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

const sampleExams: ExamItem[] = [
  {
    id: 'ex-upcoming-1',
    childId: 'c1',
    studentName: 'נועה כהן',
    name: 'מתמטיקה',
    date: '2099-05-15',
    description: 'פרק 4 - גיאומטריה',
  },
  {
    id: 'ex-upcoming-2',
    childId: 'c2',
    studentName: 'יואב כהן',
    name: 'אנגלית',
    date: '2099-06-10',
    description: 'Unit 2',
  },
  {
    id: 'ex-past-1',
    childId: 'c1',
    studentName: 'נועה כהן',
    name: 'היסטוריה',
    date: '2020-01-10',
    description: 'ימי הביניים',
    grade: '98',
  },
];

describe('ExamsScreen', () => {
  let apiFetchSpy: jest.SpyInstance;

  beforeEach(() => {
    apiFetchSpy = jest.spyOn(api, 'apiFetch').mockImplementation(async (path: string, opts?: any) => {
      if (path === '/api/webtop/config') return mockJsonResponse(multiChildConfig);
      if (path.startsWith('/api/exams') && (!opts || opts.method === 'GET')) {
        return mockJsonResponse(sampleExams);
      }
      if (path === '/api/exams' && opts?.method === 'POST') {
        return mockJsonResponse(
          {
            id: 'ex-new',
            childId: 'c1',
            studentName: 'נועה כהן',
            name: 'מדעים',
            date: '2099-07-01',
            description: 'חשמל ומגנטיות',
          },
          true,
          201
        );
      }
      if (path.startsWith('/api/exams/') && opts?.method === 'PUT') {
        return mockJsonResponse({
          ...sampleExams[0],
          name: 'מתמטיקה מורחבת',
        });
      }
      if (path.startsWith('/api/exams/') && opts?.method === 'DELETE') {
        return mockJsonResponse({ deleted: true });
      }
      return mockJsonResponse({});
    });
  });

  afterEach(() => {
    apiFetchSpy.mockRestore();
  });

  it('renders upcoming exams with study material', async () => {
    const { getByText } = render(
      <TestProviders>
        <ExamsScreen currentUser={parentUser} syncTrigger={0} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(getByText('מתמטיקה')).toBeTruthy();
      expect(getByText(/פרק 4 - גיאומטריה/)).toBeTruthy();
      expect(getByText('אנגלית')).toBeTruthy();
    });
  });

  it('switches to Past tab and displays past exams with grade badge', async () => {
    const { getByText, queryByText } = render(
      <TestProviders>
        <ExamsScreen currentUser={parentUser} syncTrigger={0} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(getByText('מתמטיקה')).toBeTruthy();
    });

    fireEvent.press(getByText('עבר'));

    await waitFor(() => {
      expect(getByText('היסטוריה')).toBeTruthy();
      expect(getByText(/98/)).toBeTruthy();
      expect(queryByText('מתמטיקה')).toBeNull();
    });
  });

  it('shows add exam button for parents and hides edit/add controls for child accounts', async () => {
    const { getByLabelText, queryByLabelText, rerender } = render(
      <TestProviders>
        <ExamsScreen currentUser={parentUser} syncTrigger={0} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(getByLabelText(/הוסף מבחן|add exam/i)).toBeTruthy();
    });

    rerender(
      <TestProviders>
        <ExamsScreen currentUser={childUser} syncTrigger={0} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(queryByLabelText(/הוסף מבחן|add exam/i)).toBeNull();
    });
  });

  it('opens Add Exam modal and creates a new exam via POST /api/exams', async () => {
    const { getByTestId, getByPlaceholderText, getByText } = render(
      <TestProviders>
        <ExamsScreen currentUser={parentUser} syncTrigger={0} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(getByTestId('add-exam-fab')).toBeTruthy();
    });

    fireEvent.press(getByTestId('add-exam-fab'));

    await waitFor(() => {
      expect(getByPlaceholderText(/שם המבחן|מתמטיקה|subject/i)).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText(/שם המבחן|מתמטיקה|subject/i), 'מדעים');
    fireEvent.press(getByTestId('exam-save-btn'));

    await waitFor(() => {
      expect(apiFetchSpy).toHaveBeenCalledWith(
        '/api/exams',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('opens Edit Exam modal and updates an exam via PUT /api/exams/:id', async () => {
    const { getAllByLabelText, getByDisplayValue, getByTestId } = render(
      <TestProviders>
        <ExamsScreen currentUser={parentUser} syncTrigger={0} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(getAllByLabelText(/ערוך מבחן|edit exam/i).length).toBeGreaterThan(0);
    });

    fireEvent.press(getAllByLabelText(/ערוך מבחן|edit exam/i)[0]);

    await waitFor(() => {
      expect(getByDisplayValue('מתמטיקה')).toBeTruthy();
    });

    fireEvent.changeText(getByDisplayValue('מתמטיקה'), 'מתמטיקה מורחבת');
    fireEvent.press(getByTestId('exam-save-btn'));

    await waitFor(() => {
      expect(apiFetchSpy).toHaveBeenCalledWith(
        '/api/exams/ex-upcoming-1',
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  it('deletes an exam through ConfirmModal via DELETE /api/exams/:id', async () => {
    const { getAllByLabelText, getByLabelText, getAllByText } = render(
      <TestProviders>
        <ExamsScreen currentUser={parentUser} syncTrigger={0} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(getAllByLabelText(/ערוך מבחן|edit exam/i).length).toBeGreaterThan(0);
    });

    fireEvent.press(getAllByLabelText(/ערוך מבחן|edit exam/i)[0]);

    await waitFor(() => {
      expect(getByLabelText('מחיקה')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('מחיקה'));

    await waitFor(() => {
      expect(getAllByText('מחיקה').length).toBeGreaterThanOrEqual(1);
    });

    const deleteBtns = getAllByText('מחיקה');
    fireEvent.press(deleteBtns[deleteBtns.length - 1]);

    await waitFor(() => {
      expect(apiFetchSpy).toHaveBeenCalledWith(
        '/api/exams/ex-upcoming-1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  it('filters exams by child tab and by search text', async () => {
    const { getByPlaceholderText, getByText, getByRole, queryByText } = render(
      <TestProviders>
        <ExamsScreen currentUser={parentUser} syncTrigger={0} />
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
    fireEvent.changeText(getByPlaceholderText(/חיפוש|search/i), 'גיאומטריה');

    await waitFor(() => {
      expect(getByText('מתמטיקה')).toBeTruthy();
      expect(queryByText('אנגלית')).toBeNull();
    });
  });

  it('renders empty state when search matches no exams', async () => {
    const { getByPlaceholderText, getByText } = render(
      <TestProviders>
        <ExamsScreen currentUser={parentUser} syncTrigger={0} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(getByText('מתמטיקה')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText(/חיפוש|search/i), 'מקצוע שלא קיים');

    await waitFor(() => {
      expect(getByText(/אין מבחנים|no upcoming exams/i)).toBeTruthy();
    });
  });
});
