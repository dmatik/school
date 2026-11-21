import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
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
import { hydrateLanguage } from './src/i18n';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { HEEBO_FONTS } from './src/theme/typography';
import {
  apiFetch,
  clearAuthOnly,
  hydrateSession,
  setActiveSession,
} from './src/lib/api';
import {
  MobileHeader,
  ScrollHeaderProvider,
  useScrollHeader,
} from './src/components/ui/MobileHeader';
import { LiquidDock, type DockTabItem } from './src/components/ui/LiquidDock';
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
  const { t } = useTranslation();
  const { palette, isDark } = useTheme();
  const { resetScroll } = useScrollHeader();

  const [booting, setBooting] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('homework');
  const [syncTrigger, setSyncTrigger] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
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
    if (!currentUser) {
      setLastSyncedAt(null);
      return;
    }
    apiFetch('/api/webtop/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((cfg) => {
        if (cfg?.lastSyncedAt) setLastSyncedAt(cfg.lastSyncedAt);
      })
      .catch(() => {});
  }, [currentUser, syncTrigger]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await hydrateLanguage();
      const { serverUrl, token } = await hydrateSession();
      if (!serverUrl || !token) {
        if (!cancelled) setBooting(false);
        return;
      }

      try {
        const res = await apiFetch('/api/auth/me');
        if (!res.ok) throw new Error('Invalid session');
        const data = await res.json();
        if (!cancelled && data?.user) {
          setCurrentUser(data.user);
        }
      } catch {
        await clearAuthOnly();
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoginSuccess = (serverUrl: string, token: string, user: User) => {
    resetScroll();
    setActiveSession(serverUrl, token);
    setCurrentUser(user);
    setActiveTab('homework');
  };

  const handleLogout = async () => {
    resetScroll();
    await clearAuthOnly();
    setCurrentUser(null);
    setActiveTab('homework');
  };

  const handleGlobalSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncSuccess(false);
    if (syncSuccessTimerRef.current) clearTimeout(syncSuccessTimerRef.current);
    try {
      const res = await apiFetch('/api/webtop/sync', { method: 'POST' });
      if (res.ok) {
        setSyncSuccess(true);
        setSyncTrigger((prev) => prev + 1);
        syncSuccessTimerRef.current = setTimeout(() => {
          setSyncSuccess(false);
        }, 3000);
      }
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
        <ActivityIndicator size="large" color={palette.primary} />
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
    <View style={[styles.shell, { backgroundColor: palette.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <MobileHeader
        title={headerTitle}
        user={currentUser}
        lastSyncedAt={lastSyncedAt}
        isAccountActive={activeTab === 'account'}
        onPressAccount={() => {
          resetScroll();
          setActiveTab('account');
        }}
        onPressSync={handleGlobalSync}
        syncing={syncing}
        syncSuccess={syncSuccess}
      />

      <View style={styles.content}>
        {activeTab === 'homework' && (
          <HomeworkScreen currentUser={currentUser} syncTrigger={syncTrigger} />
        )}
        {activeTab === 'incidents' && (
          <IncidentsScreen currentUser={currentUser} syncTrigger={syncTrigger} />
        )}
        {activeTab === 'exams' && (
          <ExamsScreen currentUser={currentUser} syncTrigger={syncTrigger} />
        )}
        {activeTab === 'schedule' && (
          <ScheduleScreen currentUser={currentUser} syncTrigger={syncTrigger} />
        )}
        {activeTab === 'settings' && (
          <SettingsScreen
            currentUser={currentUser}
            syncTrigger={syncTrigger}
            onSyncCompleted={() => setSyncTrigger((prev) => prev + 1)}
          />
        )}
        {activeTab === 'admin' && currentUser.role === 'admin' && (
          <AdminScreen currentUser={currentUser} />
        )}
        {activeTab === 'account' && (
          <AccountScreen
            currentUser={currentUser}
            onUserUpdated={setCurrentUser}
            onLogout={handleLogout}
          />
        )}
      </View>

      <LiquidDock
        items={dockItems}
        activeId={activeTab}
        onSelect={(id) => {
          resetScroll();
          setActiveTab(id as AppTab);
        }}
      />
    </View>
  );
}

const STORYBOOK_ENABLED = process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true';

export default function App() {
  const [fontsLoaded, fontError] = useFonts(HEEBO_FONTS);

  if (!fontsLoaded && !fontError) {
    return null;
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
          <AppShell />
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
  shell: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
