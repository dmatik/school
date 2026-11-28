import React from 'react';
import * as RN from 'react-native';
import { Text, View } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { BookOpen, AlertCircle, CalendarDays, Settings, Plus, Globe } from 'lucide-react-native';
import { TestProviders } from './testHelpers';
import { PageHeader } from '../src/components/ui/PageHeader';
import { MobileHeader } from '../src/components/ui/MobileHeader';
import { GlassBackdrop } from '../src/components/ui/GlassBackdrop';
import { LIGHT_PALETTE } from '../src/lib/colors';
import { AppSidebar } from '../src/components/ui/AppSidebar';
import { LiquidDock, getDockBottomMargin } from '../src/components/ui/LiquidDock';
import {
  Button,
  ActionButton,
  SyncButton,
  EditButton,
  DestructiveButton,
  LiquidButton,
  FloatingActionButton,
  ModeToggleButton,
} from '../src/components/ui/Buttons';
import {
  ChildBadge,
  StatusBadge,
  SubjectIconBadge,
  UserAvatar,
} from '../src/components/ui/Badges';
import {
  SectionCard,
  InfoBox,
  InfoItem,
  EmptyStateCard,
  NoticeBanner,
  SectionDateHeader,
} from '../src/components/ui/Surfaces';
import {
  FieldLabel,
  FilledInput,
  FilledTextarea,
  IconInput,
  CounterField,
  ReadOnlyPillField,
  TimePresetInput,
  SearchInput,
  SelectField,
  SwitchField,
  ColorSwatchPicker,
  LiquidTabs,
} from '../src/components/ui/FormFields';
import {
  HomeworkCard,
  IncidentCard,
  ExamCard,
  AdminUserRow,
  PasskeyAccountRow,
  RegisteredPasskeyRow,
} from '../src/components/ui/Cards';
import { ScheduleTable } from '../src/components/ui/ScheduleTable';
import { LiquidDatePicker, DatePickerField } from '../src/components/ui/LiquidDatePicker';
import i18n from '../src/i18n';
import type {
  User,
  ConsolidatedHomeworkItem,
  Incident,
  ExamItem,
  ScheduleLesson,
  ScheduleFinishTime,
} from '../../shared/types';

function setWindowWidth(width: number) {
  act(() => {
    RN.Dimensions.set({
      window: { width, height: 844, scale: 1, fontScale: 1 },
      screen: { width, height: 844, scale: 1, fontScale: 1 },
    });
  });
}

describe('Mobile & Desktop Shared UI Components', () => {
  afterEach(async () => {
    setWindowWidth(390);
    await act(async () => {
      await i18n.changeLanguage('he');
    });
    jest.restoreAllMocks();
  });

  describe('PageHeader', () => {
    it('renders on desktop width (>= 768) with title, description, and actions', () => {
      setWindowWidth(1280);
      const { getByTestId, getByText } = render(
        <TestProviders>
          <PageHeader
            title="Homework"
            description="Upcoming tasks"
            actions={<Text>HeaderAction</Text>}
          />
        </TestProviders>
      );
      expect(getByTestId('desktop-page-header')).toBeTruthy();
      expect(getByText('Homework')).toBeTruthy();
      expect(getByText('Upcoming tasks')).toBeTruthy();
      expect(getByText('HeaderAction')).toBeTruthy();
    });

    it('renders without description or border when omitted', () => {
      setWindowWidth(1280);
      const { getByTestId, getByText } = render(
        <TestProviders>
          <PageHeader title="Minimal" border={false} />
        </TestProviders>
      );
      expect(getByTestId('desktop-page-header')).toBeTruthy();
      expect(getByText('Minimal')).toBeTruthy();
    });

    it('returns null on mobile width (< 768)', () => {
      setWindowWidth(390);
      const { queryByTestId } = render(
        <TestProviders>
          <PageHeader title="Homework" />
        </TestProviders>
      );
      expect(queryByTestId('desktop-page-header')).toBeNull();
    });
  });

  describe('MobileHeader', () => {
    const user: User = {
      id: 'u1',
      username: 'parent1',
      firstName: 'Dana',
      lastName: 'Cohen',
      role: 'user',
      familyRole: 'parent',
    };

    it('renders title, formatted lastSyncedAt, and handles account/sync presses', () => {
      const onPressAccount = jest.fn();
      const onPressSync = jest.fn();
      const { getByText, getByTestId } = render(
        <TestProviders>
          <MobileHeader
            title="שיעורי בית"
            user={user}
            lastSyncedAt="2026-04-06T09:15:00"
            onPressAccount={onPressAccount}
            onPressSync={onPressSync}
          />
        </TestProviders>
      );

      expect(getByText('שיעורי בית')).toBeTruthy();
      expect(getByText(/06\/04\/2026 09:15/)).toBeTruthy();

      fireEvent.press(getByTestId('header-account-button'));
      expect(onPressAccount).toHaveBeenCalledTimes(1);

      fireEvent.press(getByTestId('header-sync-button'));
      expect(onPressSync).toHaveBeenCalledTimes(1);
    });

    it('supports missing lastSyncedAt and active account state', () => {
      const { getByText } = render(
        <TestProviders>
          <MobileHeader
            title="מבחנים"
            user={user}
            isAccountActive={true}
            onPressAccount={jest.fn()}
            onPressSync={jest.fn()}
          />
        </TestProviders>
      );
      expect(getByText('מבחנים')).toBeTruthy();
    });

    it('renders scroll-animated GlassBackdrop without solid bg on native mobile', () => {
      const originalOS = RN.Platform.OS;
      RN.Platform.OS = 'ios';
      try {
        const { getByTestId } = render(
          <TestProviders>
            <MobileHeader
              title="שיעורי בית"
              user={user}
              onPressAccount={jest.fn()}
              onPressSync={jest.fn()}
            />
          </TestProviders>
        );
        const header = getByTestId('mobile-header');
        const flatStyle = RN.StyleSheet.flatten(header.props.style);
        expect(flatStyle.backgroundColor).toBeUndefined();
        expect(getByTestId('mobile-header-glass')).toBeTruthy();
        expect(getByTestId('mobile-header-bottom-border')).toBeTruthy();
      } finally {
        RN.Platform.OS = originalOS;
      }
    });

    it('renders solid background without bottom border on web mobile', () => {
      const originalOS = RN.Platform.OS;
      RN.Platform.OS = 'web';
      try {
        const { getByTestId, queryByTestId } = render(
          <TestProviders>
            <MobileHeader
              title="שיעורי בית"
              user={user}
              onPressAccount={jest.fn()}
              onPressSync={jest.fn()}
            />
          </TestProviders>
        );
        const header = getByTestId('mobile-header');
        const flatStyle = RN.StyleSheet.flatten(header.props.style);
        expect(flatStyle.backgroundColor).toBe(LIGHT_PALETTE.background);
        expect(queryByTestId('mobile-header-glass')).toBeNull();
        expect(queryByTestId('mobile-header-bottom-border')).toBeNull();
      } finally {
        RN.Platform.OS = originalOS;
      }
    });
  });

  describe('GlassBackdrop', () => {
    it('renders border by default and omits it when showBorder is false', () => {
      const withBorder = render(
        <TestProviders>
          <GlassBackdrop />
        </TestProviders>
      );
      const withoutBorder = render(
        <TestProviders>
          <GlassBackdrop borderRadius={0} showBorder={false} />
        </TestProviders>
      );

      const hasBorderStyle = (tree: any): boolean => {
        const flat = RN.StyleSheet.flatten(tree?.props?.style);
        if (flat?.borderWidth === 1 && flat?.borderColor === LIGHT_PALETTE.glassBorder) {
          return true;
        }
        const children = Array.isArray(tree?.children) ? tree.children : [];
        return children.some(hasBorderStyle);
      };

      expect(hasBorderStyle(withBorder.toJSON())).toBe(true);
      expect(hasBorderStyle(withoutBorder.toJSON())).toBe(false);
    });
  });

  describe('AppSidebar, LiquidDock & LiquidTabs', () => {
    const sampleUser: User = {
      id: 'u1',
      username: 'parent1',
      firstName: 'Dana',
      lastName: 'Cohen',
      role: 'user',
      familyRole: 'parent',
    };

    const navItems = [
      { id: 'homework', label: 'Homework', icon: BookOpen },
      { id: 'incidents', label: 'Incidents', icon: AlertCircle },
      { id: 'schedule', label: 'Schedule', icon: CalendarDays },
      { id: 'settings', label: 'Settings', icon: Settings },
    ];

    it('renders AppSidebar with user name, nav tabs, and callbacks', () => {
      setWindowWidth(1280);
      const onSelectTab = jest.fn();
      const onPressAccount = jest.fn();
      const onPressSync = jest.fn();

      const { getByTestId, getByText } = render(
        <TestProviders>
          <AppSidebar
            currentUser={sampleUser}
            activeTab="homework"
            onSelectTab={onSelectTab}
            onPressAccount={onPressAccount}
            navItems={navItems}
            onPressSync={onPressSync}
            lastSyncedAt="2026-04-06T09:15:00"
          />
        </TestProviders>
      );

      expect(getByTestId('desktop-sidebar')).toBeTruthy();
      expect(getByText('Dana Cohen')).toBeTruthy();
      expect(getByText(/06\/04\/2026 09:15/)).toBeTruthy();

      fireEvent.press(getByText('Incidents'));
      expect(onSelectTab).toHaveBeenCalledWith('incidents');

      fireEvent.press(getByTestId('sidebar-account-button'));
      expect(onPressAccount).toHaveBeenCalledTimes(1);
    });

    it('falls back to username when firstName is absent and uses LTR border in English', async () => {
      setWindowWidth(1280);
      await act(async () => {
        await i18n.changeLanguage('en');
      });
      const usernameOnly: User = {
        id: 'u2',
        username: 'onlyuser',
        firstName: '',
        lastName: '',
        role: 'user',
        familyRole: 'child',
      };
      const { getByText } = render(
        <TestProviders>
          <AppSidebar
            currentUser={usernameOnly}
            activeTab="homework"
            onSelectTab={jest.fn()}
            onPressAccount={jest.fn()}
            navItems={navItems}
            onPressSync={jest.fn()}
            syncSuccess={true}
          />
        </TestProviders>
      );
      expect(getByText('onlyuser')).toBeTruthy();
    });

    it('renders LiquidDock tabs, handles 5+ scrollable items, and clamps bottom margin', () => {
      setWindowWidth(390);
      expect(getDockBottomMargin(0)).toBe(21);
      expect(getDockBottomMargin(34)).toBe(27);

      const onSelect = jest.fn();
      const fiveItems = [
        ...navItems,
        { id: 'admin', label: 'Admin', icon: Settings },
      ];
      const { getByText } = render(
        <TestProviders>
          <LiquidDock items={fiveItems} activeId="homework" onSelect={onSelect} />
        </TestProviders>
      );

      expect(getByText('Homework')).toBeTruthy();
      expect(getByText('Admin')).toBeTruthy();
      fireEvent.press(getByText('Schedule'));
      expect(onSelect).toHaveBeenCalledWith('schedule');
    });

    it('renders LiquidTabs and invokes onChange when switching tabs', async () => {
      const onChange = jest.fn();
      const { getByText } = render(
        <TestProviders>
          <LiquidTabs
            tabs={[
              { label: 'All', value: 'all' },
              { label: 'Noa', value: 'c1' },
            ]}
            value="all"
            onChange={onChange}
          />
        </TestProviders>
      );
      fireEvent.press(getByText('Noa'));
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('c1');
      });
    });
  });

  describe('Buttons & SyncButton States', () => {
    it('renders Button variants and respects disabled & loading', () => {
      const onPress = jest.fn();
      const { getByText, rerender } = render(
        <TestProviders>
          <Button label="Save" variant="primary" onPress={onPress} />
        </TestProviders>
      );
      fireEvent.press(getByText('Save'));
      expect(onPress).toHaveBeenCalledTimes(1);

      rerender(
        <TestProviders>
          <Button label="Save" variant="outline" onPress={onPress} disabled={true} />
        </TestProviders>
      );
      fireEvent.press(getByText('Save'));
      expect(onPress).toHaveBeenCalledTimes(1);

      rerender(
        <TestProviders>
          <Button label="Deleting" variant="destructive" loading={true} onPress={onPress} />
        </TestProviders>
      );
      expect(getByText('Deleting')).toBeTruthy();
    });

    it('renders SyncButton across icon, outline, pill, syncing, and success states', () => {
      const onSync = jest.fn();
      const { getByTestId, getByText, rerender } = render(
        <TestProviders>
          <SyncButton variant="pill" syncing={false} onPress={onSync} testID="sync-btn" />
        </TestProviders>
      );
      fireEvent.press(getByTestId('sync-btn'));
      expect(onSync).toHaveBeenCalledTimes(1);

      rerender(
        <TestProviders>
          <SyncButton
            variant="outline"
            syncing={true}
            syncingLabel="Syncing..."
            onPress={onSync}
            testID="sync-btn"
          />
        </TestProviders>
      );
      expect(getByText('Syncing...')).toBeTruthy();
      fireEvent.press(getByTestId('sync-btn'));
      expect(onSync).toHaveBeenCalledTimes(1);

      rerender(
        <TestProviders>
          <SyncButton
            variant="pill"
            syncing={false}
            success={true}
            successLabel="Done!"
            onPress={onSync}
            testID="sync-btn"
          />
        </TestProviders>
      );
      expect(getByText('Done!')).toBeTruthy();
    });

    it('renders ActionButton, EditButton, DestructiveButton, LiquidButton, FloatingActionButton, and ModeToggleButton', () => {
      const onEdit = jest.fn();
      const onDelete = jest.fn();
      const onLiquid = jest.fn();
      const onFab = jest.fn();

      const { getByLabelText, getByText } = render(
        <TestProviders>
          <View>
            <ActionButton label="Copy" onPress={onLiquid} />
            <EditButton onPress={onEdit} accessibilityLabel="Edit item" />
            <DestructiveButton onPress={onDelete} accessibilityLabel="Delete item" />
            <LiquidButton label="Share" onPress={onLiquid} active={true} />
            <FloatingActionButton icon={Plus} onPress={onFab} accessibilityLabel="Add item" />
            <ModeToggleButton />
          </View>
        </TestProviders>
      );

      fireEvent.press(getByText('Copy'));
      fireEvent.press(getByText('Share'));
      fireEvent.press(getByLabelText('Edit item'));
      fireEvent.press(getByLabelText('Delete item'));
      fireEvent.press(getByLabelText('Add item'));
      fireEvent.press(getByLabelText(/ערכת נושא|theme/i));

      expect(onLiquid).toHaveBeenCalledTimes(2);
      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onFab).toHaveBeenCalledTimes(1);
    });
  });

  describe('Badges & Surfaces', () => {
    it('renders ChildBadge variants, StatusBadge variants, SubjectIconBadge, and UserAvatar', () => {
      const user: User = {
        id: 'u1',
        username: 'noa',
        firstName: 'Noa',
        lastName: 'Levi',
        role: 'user',
        familyRole: 'child',
      };
      const { getByText } = render(
        <TestProviders>
          <View>
            <ChildBadge name="Noa" colorId="emerald" variant="dot" size="xs" />
            <ChildBadge name="Yoav" colorId="purple" variant="solid" size="sm" />
            <StatusBadge label="Synced" variant="success" />
            <StatusBadge label="Admin" variant="admin" />
            <StatusBadge label="Warning" variant="warning" />
            <StatusBadge label="Error" variant="destructive" />
            <SubjectIconBadge subject="מתמטיקה" variant="solid" />
            <SubjectIconBadge subject="אנגלית" variant="tinted" />
            <UserAvatar user={user} />
          </View>
        </TestProviders>
      );

      expect(getByText('Noa')).toBeTruthy();
      expect(getByText('Yoav')).toBeTruthy();
      expect(getByText('Synced')).toBeTruthy();
      expect(getByText('Admin')).toBeTruthy();
      expect(getByText('NL')).toBeTruthy();
    });

    it('renders SectionCard (divided & plain), InfoBox, InfoItem, EmptyStateCard, NoticeBanner, SectionDateHeader', () => {
      const onAction = jest.fn();
      const { getByText } = render(
        <TestProviders>
          <View>
            <SectionCard title="Profile" description="Manage user" divided={true}>
              <Text>Row 1</Text>
              <Text>Row 2</Text>
            </SectionCard>
            <InfoBox columns={2}>
              <InfoItem label="Username" value="dana" />
              <InfoItem label="Role" value="Parent" />
            </InfoBox>
            <EmptyStateCard
              icon={BookOpen}
              title="Nothing here"
              description="No items found"
              action={<Button label="Retry" onPress={onAction} />}
            />
            <NoticeBanner variant="warning" title="Heads up" description="Check settings" />
            <SectionDateHeader title="Monday, 06/04/2026" />
          </View>
        </TestProviders>
      );

      expect(getByText('Profile')).toBeTruthy();
      expect(getByText('Row 1')).toBeTruthy();
      expect(getByText('Row 2')).toBeTruthy();
      expect(getByText('Username')).toBeTruthy();
      expect(getByText('dana')).toBeTruthy();
      expect(getByText('Nothing here')).toBeTruthy();
      expect(getByText('Heads up')).toBeTruthy();
      expect(getByText('Monday, 06/04/2026')).toBeTruthy();
      fireEvent.press(getByText('Retry'));
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('FormFields', () => {
    it('renders text inputs, counter bounds, time presets, search, select, switch, and color picker', () => {
      const onChangeText = jest.fn();
      const onTimeChange = jest.fn();
      const onSearchChange = jest.fn();
      const onSelectChange = jest.fn();
      const onSwitchChange = jest.fn();
      const onColorSelect = jest.fn();

      const { getByText, getByPlaceholderText, getByLabelText, getByRole } = render(
        <TestProviders>
          <View>
            <FieldLabel label="Subject" description="Enter name" />
            <FilledInput value="Math" onChangeText={onChangeText} placeholder="Subject..." />
            <FilledTextarea value="Notes" onChangeText={onChangeText} placeholder="Notes..." />
            <IconInput icon={Globe} value="" onChangeText={onChangeText} placeholder="URL..." />
            <CounterField label="Hour" currentLength={2} maxLength={10}>
              <Text>Inner</Text>
            </CounterField>
            <ReadOnlyPillField label="Role" value="Parent" />
            <TimePresetInput label="Finish" value="13:30" onChange={onTimeChange} />
            <SearchInput value="math" onChangeText={onSearchChange} placeholder="Search..." />
            <SelectField
              label="Child"
              value="c1"
              options={[
                { label: 'Noa', value: 'c1' },
                { label: 'Yoav', value: 'c2' },
              ]}
              onValueChange={onSelectChange}
            />
            <SwitchField
              label="Auto sync"
              value={false}
              onValueChange={onSwitchChange}
            />
            <ColorSwatchPicker selectedColorId="blue" onSelectColor={onColorSelect} />
          </View>
        </TestProviders>
      );

      expect(getByText('Subject')).toBeTruthy();
      expect(getByText('Parent')).toBeTruthy();

      fireEvent.changeText(getByPlaceholderText('Subject...'), 'Science');
      expect(onChangeText).toHaveBeenCalledWith('Science');

      expect(getByText('2/10')).toBeTruthy();

      fireEvent.press(getByLabelText(/נקה חיפוש|clear/i));
      expect(onSearchChange).toHaveBeenCalledWith('');

      fireEvent.press(getByText('Noa'));
      fireEvent.press(getByText('Yoav'));
      expect(onSelectChange).toHaveBeenCalledWith('c2');

      fireEvent(getByRole('switch'), 'valueChange', true);
      expect(onSwitchChange).toHaveBeenCalledWith(true);

      fireEvent.press(getByText('15:00'));
      expect(onTimeChange).toHaveBeenCalledWith('15:00');
    });
  });

  describe('Cards (HomeworkCard, IncidentCard, ExamCard, Admin & Passkey Rows)', () => {
    it('renders HomeworkCard with single/multiple hours and optional child badge', () => {
      const item: ConsolidatedHomeworkItem = {
        id: 'hw-1',
        ids: ['hw-1'],
        studentId: 's1',
        studentName: 'Noa Levi',
        childId: 'c1',
        subject: 'מתמטיקה',
        teacher: 'רונית כהן',
        dueDate: '2026-04-06',
        hourNum: 2,
        hourNums: [2, 3],
        description: 'תרגיל 4',
        lessonSubject: 'שברים',
        completed: false,
        rawData: JSON.stringify({ homeWork: 'עמוד 24 תרגילים 1-5' }),
      };

      const { getByText, queryByText, rerender } = render(
        <TestProviders>
          <HomeworkCard item={item} childColor="blue" childFirstName="Noa" />
        </TestProviders>
      );

      expect(getByText('מתמטיקה')).toBeTruthy();
      expect(getByText('רונית כהן')).toBeTruthy();
      expect(getByText('Noa')).toBeTruthy();
      expect(getByText(/עמוד 24 תרגילים 1-5/)).toBeTruthy();

      rerender(
        <TestProviders>
          <HomeworkCard item={item} showChildBadge={false} />
        </TestProviders>
      );
      expect(queryByText('Noa')).toBeNull();
    });

    it('renders IncidentCard with subject and description', () => {
      const incident: Incident = {
        id: 'inc-1',
        studentId: 's1',
        studentName: 'Noa Levi',
        childId: 'c1',
        date: '2026-04-06',
        type: 'מילה טובה',
        description: 'השתתפות מצוינת בשיעור',
        subject: 'אנגלית',
        teacher: 'דנה',
        hourNum: 1,
        isJustified: true,
      };

      const { getByText } = render(
        <TestProviders>
          <IncidentCard item={incident} childColor="purple" childFirstName="Noa" />
        </TestProviders>
      );

      expect(getByText('אנגלית')).toBeTruthy();
      expect(getByText('Noa')).toBeTruthy();
      expect(getByText(/השתתפות מצוינת בשיעור/)).toBeTruthy();
    });

    it('renders ExamCard with edit action only when canEdit=true', () => {
      const onEdit = jest.fn();
      const exam: ExamItem = {
        id: 'ex-1',
        childId: 'c1',
        studentName: 'Noa Levi',
        name: 'מתמטיקה',
        date: '2026-04-10',
        description: 'פרק 3',
        grade: '95',
      };

      const { getByText, getByLabelText, queryByLabelText, rerender } = render(
        <TestProviders>
          <ExamCard
            exam={exam}
            childColor="emerald"
            childFirstName="Noa"
            canEdit={true}
            onEdit={onEdit}
          />
        </TestProviders>
      );

      expect(getByText('מתמטיקה')).toBeTruthy();
      expect(getByText('10/04/2026')).toBeTruthy();
      expect(getByText(/95/)).toBeTruthy();
      fireEvent.press(getByLabelText(/ערוך מבחן|edit exam/i));
      expect(onEdit).toHaveBeenCalledTimes(1);

      rerender(
        <TestProviders>
          <ExamCard
            exam={exam}
            childColor="emerald"
            childFirstName="Noa"
            canEdit={false}
            onEdit={onEdit}
          />
        </TestProviders>
      );
      expect(queryByLabelText(/ערוך מבחן|edit exam/i)).toBeNull();
    });

    it('renders AdminUserRow, PasskeyAccountRow, and RegisteredPasskeyRow', () => {
      const user: User = {
        id: 'u-1',
        username: 'dana',
        firstName: 'Dana',
        lastName: 'Cohen',
        role: 'admin',
        familyRole: 'parent',
      };
      const onEdit = jest.fn();
      const onReset = jest.fn();
      const onDelete = jest.fn();
      const onPasskey = jest.fn();

      const { getByText } = render(
        <TestProviders>
          <View>
            <AdminUserRow
              user={user}
              isSelf={false}
              onEdit={onEdit}
              onResetPassword={onReset}
              onDelete={onDelete}
            />
            <PasskeyAccountRow
              username="dana-passkey"
              firstName="Passkey"
              lastName="User"
              onPress={onPasskey}
            />
            <RegisteredPasskeyRow
              deviceName="iPhone"
              createdAtLabel="01/04/2026"
              deleteAccessibilityLabel="Delete passkey"
              onDelete={onDelete}
            />
          </View>
        </TestProviders>
      );

      expect(getByText('@dana')).toBeTruthy();
      expect(getByText('iPhone')).toBeTruthy();
      fireEvent.press(getByText('Passkey User'));
      expect(onPasskey).toHaveBeenCalledTimes(1);
    });
  });

  describe('ScheduleTable & LiquidDatePicker', () => {
    it('renders ScheduleTable lessons and finish times, and only fires edit callbacks when isEditMode=true', () => {
      const onPressCell = jest.fn();
      const onPressFinishTime = jest.fn();
      const lessons: ScheduleLesson[] = [
        {
          id: 'l-1',
          childId: 'c1',
          dayOfWeek: 0,
          hourNum: 1,
          subject: 'מתמטיקה',
          teacher: 'רונית',
        },
      ];
      const finishTimes: ScheduleFinishTime[] = [
        { id: 'ft-1', childId: 'c1', dayOfWeek: 0, finishTime: '13:30' },
      ];

      const { getByText, rerender } = render(
        <TestProviders>
          <ScheduleTable
            lessons={lessons}
            finishTimes={finishTimes}
            childColorId="blue"
            currentDayOfWeek={0}
            isEditMode={false}
            onPressCell={onPressCell}
            onPressFinishTime={onPressFinishTime}
          />
        </TestProviders>
      );

      fireEvent.press(getByText('מתמטיקה'));
      expect(onPressCell).not.toHaveBeenCalled();

      rerender(
        <TestProviders>
          <ScheduleTable
            lessons={lessons}
            finishTimes={finishTimes}
            childColorId="blue"
            currentDayOfWeek={0}
            isEditMode={true}
            onPressCell={onPressCell}
            onPressFinishTime={onPressFinishTime}
          />
        </TestProviders>
      );

      fireEvent.press(getByText('מתמטיקה'));
      expect(onPressCell).toHaveBeenCalledWith(0, 1, lessons[0]);

      fireEvent.press(getByText('13:30'));
      expect(onPressFinishTime).toHaveBeenCalledWith(0, '13:30');
    });

    it('renders LiquidDatePicker, opens calendar modal, and selects Today or Clear', () => {
      const setDate = jest.fn();
      const { getByText, rerender } = render(
        <TestProviders>
          <LiquidDatePicker setDate={setDate} />
        </TestProviders>
      );
      expect(getByText('הכל')).toBeTruthy();

      fireEvent.press(getByText('הכל'));
      fireEvent.press(getByText('היום'));
      expect(setDate).toHaveBeenCalled();
      expect(setDate.mock.calls[0][0]).toBeInstanceOf(Date);

      rerender(
        <TestProviders>
          <LiquidDatePicker date={new Date(2026, 9, 28)} setDate={setDate} />
        </TestProviders>
      );
      expect(getByText(/28\/10/)).toBeTruthy();
    });

    it('renders DatePickerField with label and opens modal', () => {
      const setDate = jest.fn();
      const { getByText } = render(
        <TestProviders>
          <DatePickerField label="Exam Date" date={new Date(2026, 9, 28)} setDate={setDate} />
        </TestProviders>
      );
      expect(getByText('Exam Date')).toBeTruthy();
      expect(getByText(/28\/10\/2026/)).toBeTruthy();
    });
  });
});
