import React, { useState } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  ChildBadge,
  StatusBadge,
  SubjectIconBadge,
  UserAvatar,
} from '../../components/ui/Badges';
import { ColorSwatchPicker } from '../../components/ui/FormFields';

const meta: Meta = {
  title: '3 - Badges & Pickers/BadgesAndPickers',
};

export default meta;

export const BadgesShowcase: StoryObj = {
  render: () => {
    const [colorId, setColorId] = useState<string | null>('blue');

    return (
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <ChildBadge name="כפיר" colorId="emerald" />
          <ChildBadge name="יובל" colorId="purple" variant="solid" />
          <StatusBadge label="מחובר ומסונכרן" variant="success" />
          <StatusBadge label="שגיאת סנכרון" variant="destructive" />
          <StatusBadge label="שיעור 3" variant="neutral" />
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <SubjectIconBadge subject="מתמטיקה" />
          <SubjectIconBadge subject="אנגלית" />
          <SubjectIconBadge subject="מדעים" />
          <SubjectIconBadge subject="עברית" />
          <SubjectIconBadge subject="ספורט" />
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

        <ColorSwatchPicker
          selectedColorId={colorId}
          onSelectColor={setColorId}
        />
      </View>
    );
  },
};
