import React, { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { BackHandler, Platform, View, Image, StyleSheet, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  BookOpen,
  AlertCircle,
  FileCheck,
  CalendarDays,
  Settings as SettingsIcon,
  Shield,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import './src/i18n';
import { hydrateLanguage, useDirection } from './src/i18n';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { HEEBO_FONTS } from './src/theme/typography';
import { useResponsiveLayout } from './src/hooks/useResponsiveLayout';
import {
  IS_COHOSTED_WEB,
  apiFetch,
  clearAuthOnly,
  hydrateSession,
  setActiveSession,
  setOnUnauthorizedHandler,
} from './src/lib/api';
import { useServerSync } from './src/hooks/useServerSync';
import {
  MobileHeader,
  ScrollHeaderProvider,
  useScrollHeader,
} from './src/components/ui/MobileHeader';
import { AppSidebar, type SidebarNavItem } from './src/components/ui/AppSidebar';
import { LiquidDock, type DockTabItem } from './src/components/ui/LiquidDock';
import { AndroidBlurTarget, AndroidBlurTargetProvider } from './src/components/ui/GlassBackdrop';
import { ModalPortalProvider } from './src/components/ui/ModalPortal';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeworkScreen } from './src/screens/HomeworkScreen';
import { IncidentsScreen } from './src/screens/IncidentsScreen';
import { ExamsScreen } from './src/screens/ExamsScreen';
import { ScheduleScreen } from './src/screens/ScheduleScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { AdminScreen } from './src/screens/AdminScreen';
import { AccountScreen } from './src/screens/AccountScreen';
import type { User } from '../src/types';

type AppTab =
  | 'homework'
  | 'incidents'
  | 'exams'
  | 'schedule'
  | 'settings'
  | 'admin'
  | 'account';

function AppShell() {
  const { t, i18n } = useTranslation();
  const { palette, isDark } = useTheme();
  const { flexRow } = useDirection();
  const { isDesktop } = useResponsiveLayout();
  const { resetScroll, switchTabScroll } = useScrollHeader();
  const contentBlurTargetRef = useRef<ComponentRef<typeof View> | null>(null);

  const [booting, setBooting] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('homework');
  const [visitedTabs, setVisitedTabs] = useState<Set<AppTab>>(() => new Set(['homework']));
  const { webtopState, foregroundTrigger, refreshConfig } = useServerSync(Boolean(currentUser));
  const lastSyncedAt = webtopState.lastSyncedAt;

  const [syncTrigger, setSyncTrigger] = useState(0);
  const [tabSyncTriggers, setTabSyncTriggers] = useState<Record<AppTab, number>>({
    homework: 0,
    incidents: 0,
    exams: 0,
    schedule: 0,
    settings: 0,
    admin: 0,
    account: 0,
  });
  const activeTabRef = useRef<AppTab>(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Case 2 (Return from Background): silently refresh only the currently visible tab
  useEffect(() => {
    if (foregroundTrigger === 0) return;
    const current = activeTabRef.current;
    setTabSyncTriggers((prev) => ({ ...prev, [current]: prev[current] + 1 }));
  }, [foregroundTrigger]);

  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const syncSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (syncSuccessTimerRef.current) clearTimeout(syncSuccessTimerRef.current);
    };
  }, []);

  useEffect(() => {
    resetScroll();
  }, [currentUser?.id, resetScroll]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = t('common.app_title');
    }
  }, [t, i18n.language]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await hydrateLanguage();
      const { serverUrl, token } = await hydrateSession();
      if ((!IS_COHOSTED_WEB && !serverUrl) || !token) {
        if (!cancelled) setBooting(false);
        return;
      }

      try {
        const res = await apiFetch('/api/auth/me');
        if (res.status === 401 || res.status === 403) {
          await clearAuthOnly();
          return;
        }
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        if (!cancelled && data?.user) {
          setCurrentUser(data.user);
        }
      } catch {
        // Transient network/offline error: keep stored token for retry.
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const tabHistoryRef = useRef<AppTab[]>([]);

  const selectTab = useCallback(
    (nextTab: AppTab, recordHistory = true) => {
      switchTabScroll(nextTab);
      const alreadyVisited = visitedTabs.has(nextTab);
      if (!alreadyVisited) {
        setVisitedTabs((prev) => new Set(prev).add(nextTab));
      } else if (nextTab !== activeTab) {
        // Case 3 (Dock tab switch): silently refresh only the newly selected tab
        setTabSyncTriggers((prev) => ({ ...prev, [nextTab]: prev[nextTab] + 1 }));
      }
      if (recordHistory && nextTab !== activeTab) {
        tabHistoryRef.current = [...tabHistoryRef.current.slice(-15), activeTab];
      }
      setActiveTab(nextTab);
      void refreshConfig(false);
    },
    [switchTabScroll, visitedTabs, activeTab, refreshConfig]
  );

  const handleLoginSuccess = (serverUrl: string, token: string, user: User) => {
    resetScroll();
    setActiveSession(serverUrl, token);
    setCurrentUser(user);
    tabHistoryRef.current = [];
    setVisitedTabs(new Set(['homework']));
    setActiveTab('homework');
  };

  const handleLogout = useCallback(async () => {
    resetScroll();
    await clearAuthOnly();
    setCurrentUser(null);
    tabHistoryRef.current = [];
    setVisitedTabs(new Set(['homework']));
    setActiveTab('homework');
  }, [resetScroll]);

  useEffect(() => {
    setOnUnauthorizedHandler(() => {
      void handleLogout();
    });
    return () => setOnUnauthorizedHandler(null);
  }, [handleLogout]);

  useEffect(() => {
    if (!currentUser) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const prev = tabHistoryRef.current.pop();
      if (prev) {
        selectTab(prev, false);
        return true;
      }
      if (activeTabRef.current !== 'homework') {
        selectTab('homework', false);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [currentUser, selectTab]);

  const handleGlobalSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncSuccess(false);
    if (syncSuccessTimerRef.current) clearTimeout(syncSuccessTimerRef.current);
    try {
      // 1. Immediately refresh internal server state across active views
      setSyncTrigger((prev) => prev + 1);
      const latestCfg = await refreshConfig(false);
      const isConfigured = latestCfg?.configured ?? webtopState.configured;

      // 2. If Webtop is configured, also sync with Webtop and refresh again
      let syncOk = true;
      if (isConfigured) {
        const res = await apiFetch('/api/webtop/sync', {
          method: 'POST',
          timeoutMs: 60000,
        });
        syncOk = res.ok;
        if (res.ok) {
          setSyncTrigger((prev) => prev + 1);
          await refreshConfig(false);
        }
      }

      if (syncOk) {
        setSyncSuccess(true);
        syncSuccessTimerRef.current = setTimeout(() => {
          setSyncSuccess(false);
        }, 2000);
      }
    } catch (err) {
      if (__DEV__) console.error('Global sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const dockItems: DockTabItem[] = useMemo(() => {
    const base: DockTabItem[] = [
      { id: 'homework', label: t('common.homework'), icon: BookOpen },
      { id: 'incidents', label: t('common.incidents'), icon: AlertCircle },
      { id: 'exams', label: t('common.exams'), icon: FileCheck },
      { id: 'schedule', label: t('common.schedule'), icon: CalendarDays },
      { id: 'settings', label: t('common.settings_short'), icon: SettingsIcon },
    ];
    if (currentUser?.role === 'admin') {
      base.push({ id: 'admin', label: t('common.admin_short'), icon: Shield });
    }
    return base;
  }, [t, currentUser?.role]);

  const sidebarItems: SidebarNavItem[] = useMemo(() => {
    const base: SidebarNavItem[] = [
      { id: 'homework', label: t('common.homework'), icon: BookOpen },
      { id: 'incidents', label: t('common.incidents'), icon: AlertCircle },
      { id: 'exams', label: t('common.exams'), icon: FileCheck },
      { id: 'schedule', label: t('common.schedule'), icon: CalendarDays },
      { id: 'settings', label: t('common.settings'), icon: SettingsIcon },
    ];
    if (currentUser?.role === 'admin') {
      base.push({ id: 'admin', label: t('common.admin'), icon: Shield });
    }
    return base;
  }, [t, currentUser?.role]);

  const headerTitle = useMemo(() => {
    switch (activeTab) {
      case 'homework':
        return t('homework.title');
      case 'incidents':
        return t('incidents.title');
      case 'exams':
        return t('exams.title');
      case 'schedule':
        return t('schedule.title');
      case 'settings':
        return t('settings.title');
      case 'admin':
        return t('admin.title');
      case 'account':
        return t('account.title');
    }
  }, [activeTab, t]);

  if (booting) {
    return (
      <View style={[styles.bootScreen, { backgroundColor: palette.background }]}>
        <Image
          source={require('./assets/splash-icon.png')}
          style={styles.bootSplashImage}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (!currentUser) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  return (
    <View
      style={[
        styles.shell,
        {
          backgroundColor: palette.background,
          flexDirection: isDesktop ? flexRow : 'column',
        },
      ]}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {isDesktop ? (
        <AppSidebar
          currentUser={currentUser}
          activeTab={activeTab}
          onSelectTab={(id) => selectTab(id as AppTab)}
          onPressAccount={() => selectTab('account')}
          navItems={sidebarItems}
          onPressSync={handleGlobalSync}
          syncing={syncing}
          syncSuccess={syncSuccess}
          lastSyncedAt={webtopState.configured ? lastSyncedAt : null}
        />
      ) : (
        <MobileHeader
          title={headerTitle}
          user={currentUser}
          lastSyncedAt={lastSyncedAt}
          isAccountActive={activeTab === 'account'}
          onPressAccount={() => selectTab('account')}
          onPressSync={handleGlobalSync}
          syncing={syncing}
          syncSuccess={syncSuccess}
        />
      )}

      <AndroidBlurTarget targetRef={contentBlurTargetRef} style={styles.content}>
        {visitedTabs.has('homework') && (
          <View
            pointerEvents={activeTab === 'homework' ? 'auto' : 'none'}
            accessibilityElementsHidden={activeTab !== 'homework'}
            importantForAccessibility={activeTab === 'homework' ? 'yes' : 'no-hide-descendants'}
            style={[styles.tabPane, activeTab !== 'homework' && styles.tabPaneHidden]}
          >
            <HomeworkScreen currentUser={currentUser} syncTrigger={syncTrigger + tabSyncTriggers.homework} />
          </View>
        )}
        {visitedTabs.has('incidents') && (
          <View
            pointerEvents={activeTab === 'incidents' ? 'auto' : 'none'}
            accessibilityElementsHidden={activeTab !== 'incidents'}
            importantForAccessibility={activeTab === 'incidents' ? 'yes' : 'no-hide-descendants'}
            style={[styles.tabPane, activeTab !== 'incidents' && styles.tabPaneHidden]}
          >
            <IncidentsScreen currentUser={currentUser} syncTrigger={syncTrigger + tabSyncTriggers.incidents} />
          </View>
        )}
        {visitedTabs.has('exams') && (
          <View
            pointerEvents={activeTab === 'exams' ? 'auto' : 'none'}
            accessibilityElementsHidden={activeTab !== 'exams'}
            importantForAccessibility={activeTab === 'exams' ? 'yes' : 'no-hide-descendants'}
            style={[styles.tabPane, activeTab !== 'exams' && styles.tabPaneHidden]}
          >
            <ExamsScreen currentUser={currentUser} syncTrigger={syncTrigger + tabSyncTriggers.exams} />
          </View>
        )}
        {visitedTabs.has('schedule') && (
          <View
            pointerEvents={activeTab === 'schedule' ? 'auto' : 'none'}
            accessibilityElementsHidden={activeTab !== 'schedule'}
            importantForAccessibility={activeTab === 'schedule' ? 'yes' : 'no-hide-descendants'}
            style={[styles.tabPane, activeTab !== 'schedule' && styles.tabPaneHidden]}
          >
            <ScheduleScreen currentUser={currentUser} syncTrigger={syncTrigger + tabSyncTriggers.schedule} />
          </View>
        )}
        {visitedTabs.has('settings') && (
          <View
            pointerEvents={activeTab === 'settings' ? 'auto' : 'none'}
            accessibilityElementsHidden={activeTab !== 'settings'}
            importantForAccessibility={activeTab === 'settings' ? 'yes' : 'no-hide-descendants'}
            style={[styles.tabPane, activeTab !== 'settings' && styles.tabPaneHidden]}
          >
            <SettingsScreen
              currentUser={currentUser}
              syncTrigger={syncTrigger + tabSyncTriggers.settings}
              onSyncCompleted={() => {
                setSyncTrigger((prev) => prev + 1);
                void refreshConfig(false);
              }}
            />
          </View>
        )}
        {visitedTabs.has('admin') && currentUser.role === 'admin' && (
          <View
            pointerEvents={activeTab === 'admin' ? 'auto' : 'none'}
            accessibilityElementsHidden={activeTab !== 'admin'}
            importantForAccessibility={activeTab === 'admin' ? 'yes' : 'no-hide-descendants'}
            style={[styles.tabPane, activeTab !== 'admin' && styles.tabPaneHidden]}
          >
            <AdminScreen currentUser={currentUser} syncTrigger={syncTrigger + tabSyncTriggers.admin} />
          </View>
        )}
        {visitedTabs.has('account') && (
          <View
            pointerEvents={activeTab === 'account' ? 'auto' : 'none'}
            accessibilityElementsHidden={activeTab !== 'account'}
            importantForAccessibility={activeTab === 'account' ? 'yes' : 'no-hide-descendants'}
            style={[styles.tabPane, activeTab !== 'account' && styles.tabPaneHidden]}
          >
            <AccountScreen
              currentUser={currentUser}
              syncTrigger={syncTrigger + tabSyncTriggers.account}
              onUserUpdated={setCurrentUser}
              onLogout={handleLogout}
            />
          </View>
        )}
      </AndroidBlurTarget>

      {!isDesktop ? (
        <AndroidBlurTargetProvider value={contentBlurTargetRef}>
          <LiquidDock
            items={dockItems}
            activeId={activeTab}
            onSelect={(id) => selectTab(id as AppTab)}
          />
        </AndroidBlurTargetProvider>
      ) : null}
    </View>
  );
}

const STORYBOOK_ENABLED = process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true';

export default function App() {
  const systemScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts(HEEBO_FONTS);

  if (!fontsLoaded && !fontError) {
    return (
      <View
        style={[
          styles.bootScreen,
          { backgroundColor: systemScheme === 'dark' ? '#090d16' : '#f6f7fc' },
        ]}
      >
        <Image
          source={require('./assets/splash-icon.png')}
          style={styles.bootSplashImage}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (STORYBOOK_ENABLED) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const StorybookUIRoot = require('./.rnstorybook').default;
    return <StorybookUIRoot />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ScrollHeaderProvider>
          <ModalPortalProvider>
            <AppShell />
          </ModalPortalProvider>
        </ScrollHeaderProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bootScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bootSplashImage: {
    width: 220,
    height: 220,
  },
  shell: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabPane: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabPaneHidden: {
    opacity: 0,
  },
});
