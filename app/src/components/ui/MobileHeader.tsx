import React, { createContext, useContext, useEffect, useMemo, useRef, useCallback, useState } from 'react';
import {
  Animated,
  Platform,
  RefreshControl,
  View,
  Text,
  Pressable,
  StyleSheet,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { RefreshCw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { heeboFont } from '../../theme/typography';
import { useDirection } from '../../i18n';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { formatSystemDateTime } from '../../lib/dateUtils';
import { UserAvatar } from './Badges';
import { SyncButton } from './Buttons';
import type { User } from '../../../../shared/types';

const PULL_THRESHOLD = 110;

interface PullToRefreshScrollProps {
  onScrollBeginDrag: () => void;
  onScrollEndDrag: () => void;
  alwaysBounceVertical: boolean;
  bounces: boolean;
  refreshControl?: React.ReactElement<React.ComponentProps<typeof RefreshControl>>;
}

interface ScrollHeaderContextValue {
  headerHeight: number;
  scrollY: Animated.Value;
  onScroll: (...args: any[]) => void;
  resetScroll: () => void;
  switchTabScroll: (tab: string) => void;
  pullToRefreshProps: PullToRefreshScrollProps;
  pullDistance: SharedValue<number>;
  isPulling: SharedValue<boolean>;
  pullReady: boolean;
  registerSync: (onRefresh: () => void, syncing: boolean) => void;
  registerScrollView: (tab: string, node: any) => void;
}

function scrollNodeToTop(node: any) {
  if (!node) return;
  const target =
    typeof node.scrollTo === 'function' || typeof node.scrollToOffset === 'function'
      ? node
      : node.getNode?.();
  if (typeof target?.scrollTo === 'function') {
    target.scrollTo({ y: 0, animated: false });
  } else if (typeof target?.scrollToOffset === 'function') {
    target.scrollToOffset({ offset: 0, animated: false });
  }
}

const ScrollHeaderContext = createContext<ScrollHeaderContextValue | null>(null);

export function ScrollHeaderProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsiveLayout();
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = isDesktop ? 0 : Math.max(insets.top, 8) + 52;

  const syncConfigRef = useRef<{ onRefresh?: () => void; syncing?: boolean }>({});
  const isDraggingRef = useRef(false);
  const readyRef = useRef(false);
  const currentTabRef = useRef<string>('homework');
  const scrollViewsRef = useRef<Record<string, any>>({});
  const [pullReady, setPullReady] = useState(false);

  const pullDistance = useSharedValue(0);
  const isPulling = useSharedValue(false);

  const [androidSyncing, setAndroidSyncing] = useState(false);

  const registerSync = useCallback((onRefresh: () => void, syncing: boolean) => {
    syncConfigRef.current = { onRefresh, syncing };
    if (Platform.OS === 'android') {
      setAndroidSyncing(syncing);
    }
  }, []);

  const registerScrollView = useCallback((tab: string, node: any) => {
    if (node) {
      scrollViewsRef.current[tab] = node;
    } else {
      delete scrollViewsRef.current[tab];
    }
  }, []);

  const clearPullState = useCallback(() => {
    isDraggingRef.current = false;
    readyRef.current = false;
    pullDistance.value = 0;
    isPulling.value = false;
    setPullReady(false);
  }, [pullDistance, isPulling]);

  const onScrollBeginDrag = useCallback(() => {
    if (syncConfigRef.current.syncing) return;
    isDraggingRef.current = true;
    readyRef.current = false;
  }, []);

  const onScrollEndDrag = useCallback(() => {
    const shouldTrigger =
      isDraggingRef.current && readyRef.current && !syncConfigRef.current.syncing;
    clearPullState();
    if (shouldTrigger) {
      syncConfigRef.current.onRefresh?.();
    }
  }, [clearPullState]);

  const onScroll = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: Platform.OS !== 'web',
      listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = e.nativeEvent.contentOffset.y;
        if (!isDraggingRef.current || syncConfigRef.current.syncing) return;
        const pull = y < 0 ? -y : 0;
        pullDistance.value = pull;
        isPulling.value = pull > 4;
        const nextReady = pull >= PULL_THRESHOLD;
        if (nextReady !== readyRef.current) {
          readyRef.current = nextReady;
          setPullReady(nextReady);
        }
      },
    })
  ).current;

  const switchTabScroll = useCallback(
    (tab: string) => {
      const prevTab = currentTabRef.current;
      if (prevTab !== tab) {
        scrollNodeToTop(scrollViewsRef.current[prevTab]);
      }
      scrollNodeToTop(scrollViewsRef.current[tab]);
      currentTabRef.current = tab;
      scrollY.setValue(0);
      clearPullState();
    },
    [scrollY, clearPullState]
  );

  const resetScroll = useCallback(() => {
    Object.values(scrollViewsRef.current).forEach(scrollNodeToTop);
    currentTabRef.current = 'homework';
    scrollY.setValue(0);
    clearPullState();
  }, [scrollY, clearPullState]);

  const pullToRefreshProps = useMemo<PullToRefreshScrollProps>(() => {
    if (isDesktop || Platform.OS === 'web') {
      return {
        onScrollBeginDrag,
        onScrollEndDrag,
        alwaysBounceVertical: false,
        bounces: false,
      };
    }
    const base: PullToRefreshScrollProps = {
      onScrollBeginDrag,
      onScrollEndDrag,
      alwaysBounceVertical: true,
      bounces: true,
    };
    if (Platform.OS === 'android') {
      base.refreshControl = (
        <RefreshControl
          refreshing={androidSyncing}
          onRefresh={() => syncConfigRef.current.onRefresh?.()}
          progressViewOffset={headerHeight}
        />
      );
    }
    return base;
  }, [isDesktop, onScrollBeginDrag, onScrollEndDrag, androidSyncing, headerHeight]);

  return (
    <ScrollHeaderContext.Provider
      value={{
        headerHeight,
        scrollY,
        onScroll,
        resetScroll,
        switchTabScroll,
        pullToRefreshProps,
        pullDistance,
        isPulling,
        pullReady,
        registerSync,
        registerScrollView,
      }}
    >
      {children}
    </ScrollHeaderContext.Provider>
  );
}

export function useScrollHeader(tabId?: string) {
  const ctx = useContext(ScrollHeaderContext);
  if (!ctx) {
    throw new Error('useScrollHeader must be used inside ScrollHeaderProvider');
  }
  const { registerScrollView } = ctx;
  const scrollRef = useCallback(
    (node: any) => {
      if (tabId) {
        registerScrollView(tabId, node);
      }
    },
    [tabId, registerScrollView]
  );
  return { ...ctx, scrollRef };
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
  const { scrollY, headerHeight, pullDistance, isPulling, pullReady, registerSync } =
    useScrollHeader();

  useEffect(() => {
    registerSync(onPressSync, syncing);
  }, [registerSync, onPressSync, syncing]);

  const spinRotation = useSharedValue(0);

  useEffect(() => {
    if (pullReady) {
      spinRotation.value = 0;
      spinRotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(spinRotation);
      spinRotation.value = 0;
    }
  }, [pullReady, spinRotation]);

  const pullIndicatorStyle = useAnimatedStyle(() => {
    if (!isPulling.value) {
      return {
        opacity: 0,
        transform: [{ translateY: -12 }, { scale: 0.85 }],
      };
    }
    const progress = Math.min(1, pullDistance.value / PULL_THRESHOLD);
    return {
      opacity: Math.min(1, 0.35 + progress * 0.65),
      transform: [
        { translateY: Math.max(-8, pullDistance.value * 0.18 - 8) },
        { scale: 0.85 + progress * 0.15 },
      ],
    };
  });

  const pullIconStyle = useAnimatedStyle(() => {
    if (pullReady) {
      return {
        transform: [{ rotate: `${spinRotation.value}deg` }],
      };
    }
    const progress = Math.min(1, pullDistance.value / PULL_THRESHOLD);
    return {
      transform: [{ rotate: `${Math.round(progress * 180)}deg` }],
    };
  });

  const formattedSync = lastSyncedAt ? formatSystemDateTime(lastSyncedAt) : '';

  const bgHex = isDark ? '#090d16' : '#f6f7fc';

  // Softly fade the gradient overlay in/out smoothly on scroll so there is never a hard line
  const gradientOpacity = scrollY.interpolate({
    inputRange: [0, 32],
    outputRange: [1, 0.96],
    extrapolate: 'clamp',
  });

  return (
    <View testID="mobile-header" style={styles.headerOuter} pointerEvents="box-none">
      {/* Gradual vertical fade extending below the header so there is no hard edge */}
      <Animated.View
        pointerEvents="none"
        style={[styles.gradientWrap, { opacity: gradientOpacity }]}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="headerFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={bgHex} stopOpacity="0.84" />
              <Stop offset="0.42" stopColor={bgHex} stopOpacity="0.82" />
              <Stop offset="0.56" stopColor={bgHex} stopOpacity="0.7" />
              <Stop offset="0.7" stopColor={bgHex} stopOpacity="0.48" />
              <Stop offset="0.84" stopColor={bgHex} stopOpacity="0.24" />
              <Stop offset="0.93" stopColor={bgHex} stopOpacity="0.08" />
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
            <View
              style={[
                styles.lastSyncedRow,
                Platform.OS === 'web' ? { marginTop: 3 } : null,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.lastSynced,
                  { color: palette.mutedForeground },
                  Platform.OS === 'web' ? { lineHeight: 10 } : null,
                ]}
              >
                {formattedSync}
              </Text>
              <View
                style={
                  Platform.OS === 'ios'
                    ? { transform: [{ translateY: -2.5 }] }
                    : Platform.OS === 'web'
                    ? { transform: [{ translateY: -0.5 }] }
                    : undefined
                }
              >
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

      <Reanimated.View
        pointerEvents="none"
        style={[
          styles.pullIndicatorWrap,
          { top: headerHeight + 4 },
          pullIndicatorStyle,
        ]}
      >
        <View
          style={[
            styles.pullIndicatorCircle,
            {
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderColor: pullReady ? palette.primary : palette.border,
            },
          ]}
        >
          <Reanimated.View style={pullIconStyle}>
            <RefreshCw
              size={16}
              strokeWidth={2}
              color={pullReady ? palette.primary : palette.mutedForeground}
            />
          </Reanimated.View>
        </View>
      </Reanimated.View>
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
    ...(Platform.OS === 'android'
      ? { minHeight: 36, paddingTop: 0 }
      : { height: 36, paddingTop: 3 }),
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  title: {
    textAlign: 'center',
    fontSize: 18,
    lineHeight: Platform.OS === 'android' ? 24 : 18,
    includeFontPadding: false,
    ...heeboFont('700'),
    letterSpacing: -0.3,
  },
  lastSyncedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: Platform.OS === 'android' ? -2 : -1,
  },
  lastSynced: {
    fontSize: 10,
    lineHeight: Platform.OS === 'android' ? 14 : 11,
    includeFontPadding: false,
    ...heeboFont('400'),
    textAlign: 'center',
  },
  pullIndicatorWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  pullIndicatorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
