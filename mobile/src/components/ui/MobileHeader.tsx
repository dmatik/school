import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useDirection } from '../../i18n';
import { UserAvatar } from './Badges';
import { SyncButton } from './Buttons';
import type { User } from '../../../../src/types';

export function MobileHeader({
  title,
  user,
  onPressAccount,
  onPressSync,
  syncing = false,
  syncSuccess = false,
}: {
  title: string;
  user: User;
  onPressAccount: () => void;
  onPressSync: () => void;
  syncing?: boolean;
  syncSuccess?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const { flexRow } = useDirection();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: Math.max(insets.top, 8) + 4,
          backgroundColor: palette.glassBg,
          borderBottomColor: palette.glassBorder,
          flexDirection: flexRow,
        },
      ]}
    >
      <Pressable
        testID="header-account-button"
        accessibilityLabel="Account"
        accessibilityRole="button"
        onPress={onPressAccount}
        hitSlop={8}
        style={styles.sideSlot}
      >
        <UserAvatar user={user} size={34} />
      </Pressable>

      <Text
        testID="mobile-header-title"
        numberOfLines={1}
        style={[styles.title, { color: palette.foreground }]}
      >
        {title}
      </Text>

      <View style={[styles.sideSlot, { alignItems: 'flex-end' }]}>
        <SyncButton
          testID="header-sync-button"
          syncing={syncing}
          success={syncSuccess}
          onPress={onPressSync}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  sideSlot: {
    width: 44,
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
  },
});
