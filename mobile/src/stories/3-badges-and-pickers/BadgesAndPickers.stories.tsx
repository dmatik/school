import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  ChildBadge,
  StatusBadge,
  SubjectIconBadge,
  UserAvatar,
} from '../../components/ui/Badges';
import { ColorSwatchPicker, FieldLabel } from '../../components/ui/FormFields';

const meta: Meta = {
  title: '3 - Badges & Pickers/BadgesAndPickers',
};

export default meta;

export const BadgesShowcase: StoryObj = {
  render: () => {
    const [colorId, setColorId] = useState<string | null>('blue');
    const [defaultColorId, setDefaultColorId] = useState<string | null>(null);

    return (
      <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 40 }}>
        <View style={{ gap: 8 }}>
          <FieldLabel label="ChildBadge (Dot vs Solid Tinted)" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <ChildBadge name="כפיר" colorId="emerald" variant="dot" />
            <ChildBadge name="רונן" colorId="purple" variant="solid" />
            <ChildBadge name="נועם" colorId="amber" variant="solid" />
            <ChildBadge name="מאיה" colorId="rose" variant="dot" />
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <FieldLabel label="StatusBadge Variants" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <StatusBadge label="מחובר ומסונכרן" variant="success" />
            <StatusBadge label="טרם הוגדר חיבור" variant="neutral" />
            <StatusBadge label="ציון: 98" variant="grade" />
            <StatusBadge label="מנהל מערכת" variant="admin" />
            <StatusBadge label="משתמש" variant="user" />
            <StatusBadge label="הורה" variant="parent" />
            <StatusBadge label="ילד/ה" variant="child" />
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <FieldLabel label="SubjectIconBadge" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <SubjectIconBadge subject="מתמטיקה" />
            <SubjectIconBadge subject="אנגלית" />
            <SubjectIconBadge subject="מדעים" />
            <SubjectIconBadge subject="עברית" />
            <SubjectIconBadge subject="ספורט" />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <UserAvatar
            user={{ firstName: 'Dmitry', lastName: 'T', username: 'admin' }}
            size={44}
          />
          <UserAvatar
            user={{ firstName: 'Kfir', lastName: 'T', username: 'kfir' }}
            size={36}
          />
        </View>

        <View style={{ gap: 10 }}>
          <FieldLabel label="ColorSwatchPicker (Selected Ring)" />
          <ColorSwatchPicker
            selectedColorId={colorId}
            onSelectColor={setColorId}
          />
          <FieldLabel label="ColorSwatchPicker (Default Selected)" />
          <ColorSwatchPicker
            selectedColorId={defaultColorId}
            onSelectColor={setDefaultColorId}
          />
        </View>
      </ScrollView>
    );
  },
};
