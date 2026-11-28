import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { heeboFont } from '../../theme/typography';
import { useDirection } from '../../i18n';
import { SIDEBAR_WIDTH } from '../../hooks/useResponsiveLayout';
import { formatSystemDateTime } from '../../lib/dateUtils';
import { UserAvatar } from './Badges';
import { SyncButton } from './Buttons';
import { ModalLayer } from './ModalPortal';
import type { User } from '../../../../shared/types';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface AppSidebarProps {
  currentUser: User;
  activeTab: string;
  onSelectTab: (id: string) => void;
  onPressAccount: () => void;
  navItems: SidebarNavItem[];
  onPressSync: () => void;
  syncing?: boolean;
  syncSuccess?: boolean;
  lastSyncedAt?: string | null;
  testID?: string;
}

export function SidebarNavButton({
  active,
  onPress,
  icon: Icon,
  label,
  testID,
}: {
  active: boolean;
  onPress: () => void;
  icon: LucideIcon;
  label: string;
  testID?: string;
}) {
  const { palette, isDark } = useTheme();
  const { flexRow, textAlign } = useDirection();
  const hoverBg = isDark
    ? 'rgba(255, 255, 255, 0.06)'
    : 'rgba(15, 23, 42, 0.05)';
  const activeBg = hoverBg;
  const activeIconFill = isDark
    ? 'rgba(87, 158, 224, 0.24)'
    : 'rgba(59, 130, 196, 0.18)';

  return (
    <Pressable
      testID={testID}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.navButton,
        {
          flexDirection: flexRow,
          backgroundColor: active
            ? activeBg
            : hovered
            ? hoverBg
            : 'transparent',
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
      ]}
    >
      <Icon
        size={18}
        strokeWidth={active ? 2.2 : 1.85}
        color={active ? palette.primary : palette.mutedForeground}
        fill={active ? activeIconFill : 'none'}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.navLabel,
          heeboFont(active ? '700' : '600'),
          {
            color: active ? palette.primary : palette.mutedForeground,
            textAlign,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function AppSidebar({
  currentUser,
  activeTab,
  onSelectTab,
  onPressAccount,
  navItems,
  onPressSync,
  syncing = false,
  syncSuccess = false,
  lastSyncedAt,
  testID = 'desktop-sidebar',
}: AppSidebarProps) {
  const { t } = useTranslation();
  const { palette, isDark } = useTheme();
  const { flexRow, textAlign, isRTL } = useDirection();
  const insets = useSafeAreaInsets();

  const displayName = currentUser.firstName
    ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim()
    : currentUser.username;

  const formattedSync = lastSyncedAt ? formatSystemDateTime(lastSyncedAt) : '';

  const sideBorderStyle = isRTL
    ? { borderLeftWidth: 1, borderLeftColor: palette.border }
    : { borderRightWidth: 1, borderRightColor: palette.border };

  return (
    <View
      testID={testID}
      style={[
        styles.sidebar,
        sideBorderStyle,
        {
          width: SIDEBAR_WIDTH,
          backgroundColor: isDark ? 'rgba(25, 32, 46, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {/* Header: Avatar + App Title + Display Name */}
      <View
        style={[
          styles.header,
          {
            flexDirection: flexRow,
            borderBottomColor: palette.border,
          },
        ]}
      >
        <Pressable
          testID="sidebar-account-button"
          accessibilityLabel={t('common.account')}
          accessibilityRole="button"
          onPress={onPressAccount}
          style={({ pressed }) => [
            styles.avatarBtn,
            { opacity: pressed ? 0.8 : 1 },
            Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
          ]}
        >
          <UserAvatar
            user={currentUser}
            size={36}
            activeRing={activeTab === 'account'}
          />
        </Pressable>

        <View style={styles.headerTextWrap}>
          <Text
            numberOfLines={1}
            style={[
              styles.appTitle,
              { color: palette.primary, textAlign },
            ]}
          >
            {t('common.app_title')}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.displayName,
              { color: palette.mutedForeground, textAlign },
            ]}
          >
            {displayName}
          </Text>
        </View>
      </View>

      {/* Navigation Items */}
      <ScrollView
        style={styles.navScroll}
        contentContainerStyle={styles.navList}
        showsVerticalScrollIndicator={false}
      >
        {navItems.map((item) => (
          <SidebarNavButton
            key={item.id}
            testID={`sidebar-tab-${item.id}`}
            active={activeTab === item.id}
            onPress={() => onSelectTab(item.id)}
            icon={item.icon}
            label={item.label}
          />
        ))}
      </ScrollView>

      {/* Footer: Sync + Last Synced + Version */}
      <View
        style={[
          styles.footer,
          {
            flexDirection: flexRow,
            borderTopColor: palette.border,
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.35)' : 'rgba(248, 250, 252, 0.65)',
          },
        ]}
      >
        <View style={[styles.footerSyncGroup, { flexDirection: flexRow }]}>
          <SyncButton
            testID="sidebar-sync-button"
            syncing={syncing}
            success={syncSuccess}
            onPress={onPressSync}
          />
          {formattedSync ? (
            <Text
              numberOfLines={1}
              style={[styles.lastSynced, { color: palette.mutedForeground }]}
            >
              {formattedSync}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function AppSidebarDrawer({
  visible,
  onClose,
  onSelectTab,
  onPressAccount,
  ...sidebarProps
}: AppSidebarProps & {
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { isRTL } = useDirection();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else if (mounted) {
      Animated.timing(progress, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start(({ finished }) => {
        if (finished) {
          setMounted(false);
        }
      });
    }
  }, [visible, mounted, progress]);

  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  if (!mounted) {
    return null;
  }

  const closedOffset = isRTL ? SIDEBAR_WIDTH : -SIDEBAR_WIDTH;
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [closedOffset, 0],
  });

  const drawerShadowStyle =
    Platform.OS === 'web'
      ? ({
          boxShadow: isDark
            ? '0 16px 40px rgba(0, 0, 0, 0.55)'
            : '0 16px 40px rgba(15, 23, 42, 0.18)',
        } as any)
      : {
          shadowColor: '#000',
          shadowOpacity: isDark ? 0.45 : 0.18,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
          elevation: 16,
        };

  return (
    <ModalLayer
      visible={mounted}
      onRequestClose={onClose}
      animationType="none"
    >
      <View
        testID="mobile-sidebar-drawer"
        style={styles.drawerRoot}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <Animated.View style={[StyleSheet.absoluteFill, styles.drawerBackdrop, { opacity: progress }]}>
          <Pressable
            testID="mobile-sidebar-backdrop"
            accessibilityLabel={t('common.close')}
            accessibilityRole="button"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.drawerPanel,
            isRTL ? styles.drawerPanelRight : styles.drawerPanelLeft,
            drawerShadowStyle,
            { transform: [{ translateX }] },
          ]}
        >
          <AppSidebar
            {...sidebarProps}
            onSelectTab={(id) => {
              onSelectTab(id);
              onClose();
            }}
            onPressAccount={() => {
              onPressAccount();
              onClose();
            }}
          />
        </Animated.View>
      </View>
    </ModalLayer>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    flexShrink: 0,
    height: '100%',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  avatarBtn: {
    borderRadius: 999,
    flexShrink: 0,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  appTitle: {
    fontSize: 18,
    letterSpacing: -0.3,
    ...heeboFont('800'),
  },
  displayName: {
    fontSize: 12,
    ...heeboFont('500'),
  },
  navScroll: {
    flex: 1,
  },
  navList: {
    padding: 12,
    gap: 4,
  },
  navButton: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    gap: 12,
  },
  navLabel: {
    flex: 1,
    fontSize: 14,
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  footerSyncGroup: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  lastSynced: {
    fontSize: 10,
    ...heeboFont('400'),
    flexShrink: 1,
  },
  drawerRoot: {
    flex: 1,
    position: 'relative',
  },
  drawerBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  drawerPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    height: '100%',
    width: SIDEBAR_WIDTH,
  },
  drawerPanelLeft: {
    left: 0,
  },
  drawerPanelRight: {
    right: 0,
  },
});
