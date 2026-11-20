import React, { createContext, useContext, useRef, useCallback } from 'react';
import { Animated, View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { RefreshCw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { heeboFont } from '../../theme/typography';
import { useDirection } from '../../i18n';
import { formatSystemDateTime } from '../../lib/dateUtils';
import { UserAvatar } from './Badges';
import { SyncButton } from './Buttons';
import type { User } from '../../../../src/types';

interface ScrollHeaderContextValue {
  headerHeight: number;
  scrollY: Animated.Value;
  onScroll: (...args: any[]) => void;
  resetScroll: () => void;
}

const ScrollHeaderContext = createContext<ScrollHeaderContextValue | null>(null);

export function ScrollHeaderProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = Math.max(insets.top, 8) + 52;

  const onScroll = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: true,
    })
  ).current;

  const resetScroll = useCallback(() => {
    scrollY.setValue(0);
  }, [scrollY]);

  return (
    <ScrollHeaderContext.Provider
      value={{ headerHeight, scrollY, onScroll, resetScroll }}
    >
      {children}
    </ScrollHeaderContext.Provider>
  );
}

export function useScrollHeader() {
  const ctx = useContext(ScrollHeaderContext);
  if (!ctx) {
    throw new Error('useScrollHeader must be used inside ScrollHeaderProvider');
  }
  return ctx;
}

export function MobileHeader({
  title,
  user,
  lastSyncedAt,
  isAccountActive = false,
  onPressAccount,
  onPressSync,
  syncing = false,
  syncSuccess = false,
}: {
  title: string;
  user: User;
  lastSyncedAt?: string | null;
  isAccountActive?: boolean;
  onPressAccount: () => void;
  onPressSync: () => void;
  syncing?: boolean;
  syncSuccess?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { palette, isDark } = useTheme();
  const { flexRow } = useDirection();
  const { scrollY } = useScrollHeader();

  const formattedSync = lastSyncedAt ? formatSystemDateTime(lastSyncedAt) : '';

  const bgHex = isDark ? '#090d16' : '#f6f7fc';

  // Softly fade the gradient overlay in/out smoothly on scroll so there is never a hard line
  const gradientOpacity = scrollY.interpolate({
    inputRange: [0, 32],
    outputRange: [1, 0.96],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.headerOuter} pointerEvents="box-none">
      {/* Gradual vertical fade extending below the header so there is no hard edge */}
      <Animated.View
        pointerEvents="none"
        style={[styles.gradientWrap, { opacity: gradientOpacity }]}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="headerFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={bgHex} stopOpacity="1" />
              <Stop offset="0.45" stopColor={bgHex} stopOpacity="1" />
              <Stop offset="0.58" stopColor={bgHex} stopOpacity="0.92" />
              <Stop offset="0.72" stopColor={bgHex} stopOpacity="0.7" />
              <Stop offset="0.85" stopColor={bgHex} stopOpacity="0.38" />
              <Stop offset="0.94" stopColor={bgHex} stopOpacity="0.12" />
              <Stop offset="1" stopColor={bgHex} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#headerFade)" />
        </Svg>
      </Animated.View>

      <View
        style={[
          styles.headerRow,
          {
            paddingTop: Math.max(insets.top, 8) + 6,
            flexDirection: flexRow,
          },
        ]}
      >
        <Pressable
          testID="header-account-button"
          accessibilityLabel={t('common.account')}
          accessibilityRole="button"
          onPress={onPressAccount}
          hitSlop={8}
          style={styles.sideSlot}
        >
          <UserAvatar user={user} size={36} activeRing={isAccountActive} />
        </Pressable>

        <View style={styles.titleWrap}>
          <Text
            testID="mobile-header-title"
            numberOfLines={1}
            style={[styles.title, { color: palette.foreground }]}
          >
            {title}
          </Text>
          {formattedSync ? (
            <View style={styles.lastSyncedRow}>
              <Text
                numberOfLines={1}
                style={[styles.lastSynced, { color: palette.mutedForeground }]}
              >
                {formattedSync}
              </Text>
              <View style={{ transform: [{ translateY: -2.5 }] }}>
                <RefreshCw size={10} color={palette.mutedForeground} />
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.sideSlot}>
          <SyncButton
            testID="header-sync-button"
            syncing={syncing}
            success={syncSuccess}
            onPress={onPressSync}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerOuter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 14,
    zIndex: 20,
  },
  gradientWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerRow: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideSlot: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    paddingTop: 3,
  },
  title: {
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 18,
    includeFontPadding: false,
    ...heeboFont('700'),
    letterSpacing: -0.3,
  },
  lastSyncedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: -1,
  },
  lastSynced: {
    fontSize: 10,
    lineHeight: 11,
    includeFontPadding: false,
    ...heeboFont('400'),
    textAlign: 'center',
  },
});
