import React, { useState } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  BookOpen,
  AlertCircle,
  FileCheck,
  CalendarDays,
  Settings,
  Shield,
  Plus,
  Share2,
} from 'lucide-react-native';
import {
  ActionButton,
  Button,
  DestructiveButton,
  EditButton,
  FloatingActionButton,
  LiquidButton,
  SyncButton,
  ModeToggleButton,
  LanguageToggleButton,
} from '../../components/ui/Buttons';
import { LiquidTabs, StickyFilterBar } from '../../components/ui/FormFields';
import { LiquidDatePicker } from '../../components/ui/LiquidDatePicker';
import { LiquidDock } from '../../components/ui/LiquidDock';
import { MobileHeader } from '../../components/ui/MobileHeader';
import { AppSidebar } from '../../components/ui/AppSidebar';
import { SlidingPill } from '../../components/ui/SlidingPill';
import { useTheme } from '../../theme/ThemeContext';

const meta: Meta = {
  title: '2 - Buttons & Nav/NavigationAndActions',
};

export default meta;

export const Buttons: StoryObj = {
  render: () => (
    <View style={{ gap: 12 }}>
      <Button label="Primary Button" onPress={() => {}} />
      <Button label="Outline Button" variant="outline" onPress={() => {}} />
      <Button label="Destructive Button" variant="destructive" onPress={() => {}} />
      <Button label="Ghost Button" variant="ghost" onPress={() => {}} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <SyncButton variant="outline" syncing={false} onPress={() => {}} />
        <SyncButton variant="outline" syncing={true} onPress={() => {}} />
        <SyncButton variant="outline" syncing={false} success={true} onPress={() => {}} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <EditButton onPress={() => {}} />
        <DestructiveButton label="נתק חיבור" onPress={() => {}} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <ModeToggleButton />
        <LanguageToggleButton />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <ActionButton label="Default" variant="default" onPress={() => {}} />
        <ActionButton label="Outline" variant="outline" onPress={() => {}} />
        <ActionButton label="Muted" variant="muted" onPress={() => {}} />
        <ActionButton label="Ghost" variant="ghost" onPress={() => {}} />
        <ActionButton label="Destructive" variant="destructive" onPress={() => {}} />
      </View>

      <StickyFilterBar>
        <LiquidTabs
          tabs={[
            { label: 'הכל', value: 'all' },
            { label: 'כפיר', value: '1' },
          ]}
          value="all"
          onChange={() => {}}
        />
      </StickyFilterBar>
    </View>
  ),
};

export const LiquidFiltersAndDatePicker: StoryObj = {
  render: () => {
    const [child, setChild] = useState('all');
    const [date, setDate] = useState<Date | undefined>(undefined);

    return (
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <LiquidTabs
              tabs={[
                { label: 'הכל', value: 'all' },
                { label: 'כפיר', value: '1' },
                { label: 'יובל', value: '2' },
              ]}
              value={child}
              onChange={setChild}
            />
          </View>
          <LiquidDatePicker date={date} setDate={setDate} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <LiquidTabs
              tabs={[
                { label: 'כפיר', value: '1' },
                { label: 'יובל', value: '2' },
              ]}
              value={child === 'all' ? '1' : child}
              onChange={setChild}
            />
          </View>
          <LiquidButton icon={Share2} label="שיתוף" onPress={() => {}} />
        </View>
      </View>
    );
  },
};

export const DockAndHeader: StoryObj = {
  render: () => {
    const [active, setActive] = useState('homework');
    return (
      <View style={{ flex: 1, minHeight: 360 }}>
        <MobileHeader
          title="שיעורי בית"
          user={{
            id: '1',
            username: 'admin',
            firstName: 'Dmitry',
            lastName: 'T',
            role: 'admin',
            familyRole: 'parent',
          }}
          onPressAccount={() => {}}
          onPressSync={() => {}}
        />
        <FloatingActionButton
          icon={Plus}
          accessibilityLabel="Add"
          onPress={() => {}}
        />
        <LiquidDock
          items={[
            { id: 'homework', label: 'שיעורי בית', icon: BookOpen },
            { id: 'incidents', label: 'אירועים', icon: AlertCircle },
            { id: 'exams', label: 'מבחנים', icon: FileCheck },
            { id: 'schedule', label: 'מערכת', icon: CalendarDays },
            { id: 'settings', label: 'הגדרות', icon: Settings },
            { id: 'admin', label: 'ניהול', icon: Shield },
          ]}
          activeId={active}
          onSelect={setActive}
        />
      </View>
    );
  },
};

export const SlidingPillDemo: StoryObj = {
  render: () => {
    const { isDark } = useTheme();
    const [pos, setPos] = useState({ x: 0, width: 72 });

    return (
      <View style={{ gap: 16 }}>
        <View style={{ height: 40, borderRadius: 999, position: 'relative', justifyContent: 'center' }}>
          <SlidingPill x={pos.x} width={pos.width} height={32} isDark={isDark} top={4} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label="Short (0, 72)" onPress={() => setPos({ x: 0, width: 72 })} />
          <Button label="Wide (80, 140)" onPress={() => setPos({ x: 80, width: 140 })} />
        </View>
      </View>
    );
  },
};

export const DesktopSidebar: StoryObj = {
  render: () => {
    const [active, setActive] = useState('homework');
    return (
      <View style={{ height: 520, flexDirection: 'row' }}>
        <AppSidebar
          currentUser={{
            id: 'u-1',
            username: 'parent1',
            firstName: 'דוד',
            lastName: 'כהן',
            role: 'admin',
            familyRole: 'parent',
            linkedChildId: null,
          }}
          activeTab={active}
          onSelectTab={setActive}
          onPressAccount={() => setActive('account')}
          onPressSync={() => {}}
          lastSyncedAt={new Date().toISOString()}
          navItems={[
            { id: 'homework', label: 'שיעורי בית', icon: BookOpen },
            { id: 'incidents', label: 'אירועים', icon: AlertCircle },
            { id: 'exams', label: 'מבחנים', icon: FileCheck },
            { id: 'schedule', label: 'מערכת שעות', icon: CalendarDays },
            { id: 'settings', label: 'הגדרות', icon: Settings },
            { id: 'admin', label: 'ניהול', icon: Shield },
          ]}
        />
      </View>
    );
  },
};
