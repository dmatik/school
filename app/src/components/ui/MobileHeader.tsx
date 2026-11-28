import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RefreshCw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { heeboFont } from '../../theme/typography';
import { useDirection } from '../../i18n';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { formatSystemDateTime } from '../../lib/dateUtils';
import { UserAvatar } from './Badges';
import {
  HeaderActionButton,
  MenuButton,
  SyncButton,
  type HeaderActionButtonProps,
} from './Buttons';
import { GlassBackdrop } from './GlassBackdrop';
import {
  PULL_THRESHOLD,
  ScrollHeaderProvider,
  getScrollVisibilityWebStyle,
  useOptionalScrollHeader,
  useScrollHeader,
} from './ScrollHeaderContext';
import type { User } from '../../../../shared/types';

export {
  ScrollHeaderProvider,
  getScrollVisibilityWebStyle,
  useOptionalScrollHeader,
  useScrollHeader,
};

export interface MobileHeaderProps {
  title: string;
  user: User;
  lastSyncedAt?: string | null;
  isAccountActive?: boolean;
  onPressAccount: () => void;
  onPressSync: () => void;
  onPressMenu?: () => void;
  syncing?: boolean;
  syncSuccess?: boolean;
  endAction?: HeaderActionButtonProps | null;
  inline?: boolean;
}

interface MobileHeaderActionRegistry {
  actions: Record<string, HeaderActionButtonProps | null>;
  setAction: (tabId: string, action: HeaderActionButtonProps | null) => void;
}

const MobileHeaderActionContext = createContext<MobileHeaderActionRegistry | null>(null);

export function MobileHeaderActionProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActions] = useState<Record<string, HeaderActionButtonProps | null>>({});

  const setAction = useCallback((tabId: string, action: HeaderActionButtonProps | null) => {
    setActions((prev) => {
      if (action === null && !(tabId in prev)) {
        return prev;
      }
      if (action === null) {
        const next = { ...prev };
        delete next[tabId];
        return next;
      }
      return { ...prev, [tabId]: action };
    });
  }, []);

  return (
    <MobileHeaderActionContext.Provider value={{ actions, setAction }}>
      {children}
    </MobileHeaderActionContext.Provider>
  );
}

export function useMobileHeaderAction(
  tabId: string,
  action: HeaderActionButtonProps | null
) {
  const ctx = useContext(MobileHeaderActionContext);
  const setAction = ctx?.setAction;
  const onPressRef = useRef(action?.onPress);
  onPressRef.current = action?.onPress;

  const hasAction = Boolean(action);
  const icon = action?.icon;
  const accessibilityLabel = action?.accessibilityLabel;
  const testID = action?.testID;
  const variant = action?.variant;
  const disabled = action?.disabled;

  useEffect(() => {
    if (!setAction) return;
    if (!hasAction || !icon || !accessibilityLabel) {
      setAction(tabId, null);
      return;
    }
    setAction(tabId, {
      icon,
      accessibilityLabel,
      testID,
      variant,
      disabled,
      onPress: () => onPressRef.current?.(),
    });
  }, [setAction, tabId, hasAction, icon, accessibilityLabel, testID, variant, disabled]);

  useEffect(() => {
    if (!setAction) return;
    return () => setAction(tabId, null);
  }, [setAction, tabId]);
}

export function useActiveMobileHeaderAction(tabId: string): HeaderActionButtonProps | null {
  const ctx = useContext(MobileHeaderActionContext);
  return ctx?.actions[tabId] ?? null;
}

const WebMobileHeaderContext = createContext<Omit<MobileHeaderProps, 'inline'> | null>(null);
const WebMobileHeaderActiveContext = createContext<boolean>(true);

export const WebMobileHeaderProvider = WebMobileHeaderContext.Provider;
export const WebMobileHeaderActiveProvider = WebMobileHeaderActiveContext.Provider;

export function InlineWebMobileHeader() {
  const headerProps = useContext(WebMobileHeaderContext);
  const isActiveTab = useContext(WebMobileHeaderActiveContext);
  const { isDesktop } = useResponsiveLayout();
  if (Platform.OS !== 'web' || isDesktop || !headerProps || !isActiveTab) {
    return null;
  }
  return <MobileHeader {...headerProps} inline />;
}

export function MobileHeader({
  title,
  user,
  lastSyncedAt,
  isAccountActive = false,
  onPressAccount,
  onPressSync,
  onPressMenu,
  syncing = false,
  syncSuccess = false,
  endAction = null,
  inline = false,
}: MobileHeaderProps) {
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
  const sideMinWidth = endAction || onPressMenu ? 80 : 36;

  const isWeb = Platform.OS === 'web';
  const nativeBorderColor = isDark
    ? 'rgba(255, 255, 255, 0.12)'
    : 'rgba(15, 23, 42, 0.09)';
  const scrollProgress = scrollY.interpolate({
    inputRange: [0, 16],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View
      testID="mobile-header"
      style={[
        inline ? styles.headerInline : styles.headerOuter,
        isWeb ? { backgroundColor: palette.background } : null,
      ]}
      pointerEvents="box-none"
    >
      {!isWeb ? (
        <Animated.View
          testID="mobile-header-glass"
          pointerEvents="none"
          style={[styles.backdropWrap, { opacity: scrollProgress }]}
        >
          <GlassBackdrop borderRadius={0} showBorder={false} />
          <View
            testID="mobile-header-bottom-border"
            style={[styles.bottomBorder, { backgroundColor: nativeBorderColor }]}
          />
        </Animated.View>
      ) : null}

      <View
        style={[
          styles.headerRow,
          {
            paddingTop: inline ? 0 : Math.max(insets.top, 8) + 6,
            paddingHorizontal: inline ? 0 : 16,
            flexDirection: flexRow,
          },
        ]}
      >
        <View
          style={[
            styles.startSlot,
            { minWidth: sideMinWidth, flexDirection: flexRow },
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
          {onPressMenu ? (
            <View style={styles.sideSlot}>
              <MenuButton testID="header-menu-button" onPress={onPressMenu} />
            </View>
          ) : null}
        </View>

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

        <View
          style={[
            styles.endSlot,
            { minWidth: sideMinWidth, flexDirection: flexRow },
          ]}
        >
          <View style={styles.sideSlot}>
            <SyncButton
              testID="header-sync-button"
              syncing={syncing}
              success={syncSuccess}
              onPress={onPressSync}
            />
          </View>
          {endAction ? <HeaderActionButton {...endAction} /> : null}
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
    zIndex: 20,
  },
  headerInline: {
    width: '100%',
  },
  backdropWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomBorder: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: Platform.OS === 'web' ? 1 : StyleSheet.hairlineWidth,
  },
  headerRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  startSlot: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },
  endSlot: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
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
