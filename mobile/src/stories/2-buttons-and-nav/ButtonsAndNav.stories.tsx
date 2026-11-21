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
  Button,
  FloatingActionButton,
  LiquidButton,
  SyncButton,
  ModeToggleButton,
  LanguageToggleButton,
} from '../../components/ui/Buttons';
import { LiquidTabs } from '../../components/ui/FormFields';
import { LiquidDatePicker } from '../../components/ui/LiquidDatePicker';
import { LiquidDock } from '../../components/ui/LiquidDock';
import { MobileHeader } from '../../components/ui/MobileHeader';

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
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <SyncButton syncing={false} onPress={() => {}} label="Sync" />
        <ModeToggleButton />
        <LanguageToggleButton />
      </View>
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
