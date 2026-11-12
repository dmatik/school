import { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertCircle,
  BookOpen,
  Shield,
  Settings as SettingsIcon,
  Loader2,
  FileCheck,
  CalendarDays,
} from "lucide-react"
import { Toaster } from "@/components/ui/toaster"
import {
  AppSidebar,
  type SidebarNavItem,
  BookOpenFull,
  AlertCircleFull,
  CalendarDaysFull,
  SettingsFull,
  FileCheckFull,
} from "@/components/ui/app-sidebar"
import { MobileHeader } from "@/components/ui/mobile-header"
import { LiquidDock, type DockItem } from "@/components/ui/liquid-dock"
import { SyncButton } from "@/components/ui/sync-button"
import { NoticeBanner } from "@/components/ui/notice-banner"
import { toast } from "@/hooks/use-toast"
import type { User } from "@/types"
import { LoginView } from "@/components/LoginView"
import { useTranslation } from "react-i18next"
import { DirectionProvider } from "@radix-ui/react-direction"

// Lazy load views
const IncidentsPage = lazy(() => import("@/components/IncidentsPage").then(module => ({ default: module.IncidentsPage })))
const HomeworkPage = lazy(() => import("@/components/HomeworkPage").then(module => ({ default: module.HomeworkPage })))
const ExamsPage = lazy(() => import("@/components/ExamsPage").then(module => ({ default: module.ExamsPage })))
const SchedulePage = lazy(() => import("@/components/SchedulePage").then(module => ({ default: module.SchedulePage })))
const SettingsPage = lazy(() => import("@/components/SettingsPage").then(module => ({ default: module.SettingsPage })))
const AccountPage = lazy(() => import("@/components/AccountPage").then(module => ({ default: module.AccountPage })))
const AdminPage = lazy(() => import("@/components/AdminPage").then(module => ({ default: module.AdminPage })))

const LoadingSpinner = () => (
  <div className="flex h-full w-full items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
)

type AppTab = 'homework' | 'incidents' | 'exams' | 'schedule' | 'settings' | 'admin' | 'account'

function App() {
  const { t, i18n } = useTranslation()
  const [activeTab, setActiveTab] = useState<AppTab>('homework')

  // Auth State
  const [token, setToken] = useState<string | null>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem("auth_token") : null
    if (saved) return saved
    if (import.meta.env.MODE === 'test') {
      return 'test-token'
    }
    return null
  })

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (import.meta.env.MODE === 'test') {
      return {
        id: 'test-admin',
        username: 'admin',
        firstName: 'Test',
        lastName: 'Admin',
        role: 'admin',
        familyRole: 'parent',
        linkedChildId: null
      }
    }
    return null
  })

  const [authChecking, setAuthChecking] = useState<boolean>(() => {
    if (import.meta.env.MODE === 'test') return false
    const saved = typeof window !== 'undefined' ? localStorage.getItem("auth_token") : null
    return Boolean(saved)
  })

  // Verify auth session
  useEffect(() => {
    if (!token) return

    let cancelled = false

    fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Invalid session")
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          setCurrentUser(data.user)
          setAuthChecking(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem("auth_token")
          setToken(null)
          setCurrentUser(null)
          setAuthChecking(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const handleLoginSuccess = (newToken: string, user: User) => {
    localStorage.setItem("auth_token", newToken)
    setToken(newToken)
    setCurrentUser(user)
    setActiveTab('homework')
  }

  const handleLogout = () => {
    localStorage.removeItem("auth_token")
    setToken(null)
    setCurrentUser(null)
    setActiveTab('homework')
  }

  // Update document title on language change
  useEffect(() => {
    document.title = t('common.app_title')
  }, [t, i18n.language])

  // Track scroll state on mobile for dynamic Apple glass header/footer effects
  const [isScrolled, setIsScrolled] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement | null
      if (!target || typeof target.scrollTop !== 'number') return

      const scrolled = target.scrollTop > 8
      setIsScrolled(scrolled)
      setIsScrolling(true)

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false)
      }, 300)
    }

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true })
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  const handleTabChange = (tab: AppTab) => {
    setActiveTab(tab)
    setIsScrolled(false)
    setIsScrolling(false)
  }

  // Webtop sync state & triggers
  const [webtopConfigured, setWebtopConfigured] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncSuccess, setSyncSuccess] = useState(false)
  const [syncSummary, setSyncSummary] = useState<string | null>(null)
  const syncSuccessTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [syncTrigger, setSyncTrigger] = useState(0)
  const [autoSyncPaused, setAutoSyncPaused] = useState(false)
  const onOpenSyncCheckedRef = useRef(false)

  const mobileNavItems = useMemo<DockItem<AppTab>[]>(() => {
    const items: DockItem<AppTab>[] = [
      { tab: 'homework', icon: BookOpen, activeIcon: BookOpenFull, label: t('common.homework') },
      { tab: 'incidents', icon: AlertCircle, activeIcon: AlertCircleFull, label: t('common.incidents') },
      { tab: 'exams', icon: FileCheck, activeIcon: FileCheckFull, label: t('common.exams') },
      { tab: 'schedule', icon: CalendarDays, activeIcon: CalendarDaysFull, label: t('common.schedule') },
      { tab: 'settings', icon: SettingsIcon, activeIcon: SettingsFull, label: t('common.settings_short') },
    ]
    if (currentUser?.role === 'admin') {
      items.push({ tab: 'admin', icon: Shield, label: t('common.admin_short') })
    }
    return items
  }, [currentUser?.role, t])

  const checkWebtopConfig = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch("/api/webtop/config", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setWebtopConfigured(Boolean(data.configured))
        setAutoSyncPaused(Boolean(data.autoSyncAvailable && data.autoSyncPaused))
        return data as { configured?: boolean; autoSyncAvailable?: boolean; autoSyncEnabled?: boolean }
      }
    } catch {
      // ignore
    }
    return null
  }, [token])

  useEffect(() => {
    checkWebtopConfig()
    const handleConfigChange = () => {
      checkWebtopConfig()
    }
    window.addEventListener("webtop:configured", handleConfigChange)
    return () => {
      window.removeEventListener("webtop:configured", handleConfigChange)
    }
  }, [checkWebtopConfig])

  // Production only: when the app is opened, refresh stale data (server decides; it skips in dev)
  useEffect(() => {
    if (!token || onOpenSyncCheckedRef.current) return
    onOpenSyncCheckedRef.current = true
    ;(async () => {
      const cfg = await checkWebtopConfig()
      if (!cfg?.configured || !cfg.autoSyncAvailable || !cfg.autoSyncEnabled) return
      try {
        const res = await fetch("/api/webtop/sync-if-stale", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) return
        const data = await res.json()
        if (!data.skipped) {
          setSyncTrigger(prev => prev + 1)
          checkWebtopConfig()
        }
      } catch {
        // silent: background refresh must never disturb the user
      }
    })()
  }, [token, checkWebtopConfig])

  // Listen to external sync events (e.g. from SettingsPage) to show green checkmark
  useEffect(() => {
    const handleSyncedEvent = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail?.incidentsCount !== undefined || customEvent.detail?.homeworkCount !== undefined) {
        setSyncSummary(t("account.webtop_sync_success", {
          incidents: customEvent.detail?.incidentsCount || 0,
          homework: customEvent.detail?.homeworkCount || 0
        }))
      }
      setSyncSuccess(true)
      checkWebtopConfig()
      if (syncSuccessTimerRef.current) clearTimeout(syncSuccessTimerRef.current)
      syncSuccessTimerRef.current = setTimeout(() => {
        setSyncSuccess(false)
      }, 3000)
    }

    window.addEventListener("webtop:synced", handleSyncedEvent)
    return () => {
      window.removeEventListener("webtop:synced", handleSyncedEvent)
      if (syncSuccessTimerRef.current) clearTimeout(syncSuccessTimerRef.current)
    }
  }, [t, checkWebtopConfig])

  const handleSync = async () => {
    if (!token || syncing) return
    setSyncing(true)
    setSyncSuccess(false)
    try {
      const res = await fetch("/api/webtop/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || t("account.sync_failed"))
      }

      setSyncTrigger(prev => prev + 1)
      const summary = t("account.webtop_sync_success", {
        incidents: data.result?.incidentsCount || 0,
        homework: data.result?.homeworkCount || 0
      })
      setSyncSummary(summary)
      setSyncSuccess(true)
      if (syncSuccessTimerRef.current) clearTimeout(syncSuccessTimerRef.current)
      syncSuccessTimerRef.current = setTimeout(() => {
        setSyncSuccess(false)
      }, 3000)

      window.dispatchEvent(new CustomEvent("webtop:synced", {
        detail: {
          incidentsCount: data.result?.incidentsCount || 0,
          homeworkCount: data.result?.homeworkCount || 0
        }
      }))
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("account.sync_error")
      })
    } finally {
      setSyncing(false)
    }
  }

  const desktopNavItems = useMemo<SidebarNavItem<AppTab>[]>(() => {
    const items: SidebarNavItem<AppTab>[] = [
      {
        tab: 'homework',
        label: t('common.homework'),
        icon: BookOpen,
        activeIcon: BookOpenFull,
      },
      {
        tab: 'incidents',
        label: t('common.incidents'),
        icon: AlertCircle,
        activeIcon: AlertCircleFull,
      },
      {
        tab: 'exams',
        label: t('common.exams'),
        icon: FileCheck,
        activeIcon: FileCheckFull,
      },
      {
        tab: 'schedule',
        label: t('common.schedule'),
        icon: CalendarDays,
        activeIcon: CalendarDaysFull,
      },
      {
        tab: 'settings',
        label: t('common.settings'),
        icon: SettingsIcon,
        activeIcon: SettingsFull,
      },
    ]

    if (currentUser?.role === 'admin') {
      items.push({
        tab: 'admin',
        label: t('common.admin'),
        icon: Shield,
      })
    }

    return items
  }, [t, currentUser?.role])

  const renderWebtopSyncButton = () => {
    if (!webtopConfigured) return null
    return (
      <SyncButton
        onClick={handleSync}
        syncing={syncing}
        success={syncSuccess}
        summary={syncSummary}
      />
    )
  }

  // Initial auth checking state
  if (authChecking) {
    return (
      <div className="h-dvh w-full flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    )
  }

  // Unauthenticated view
  if (!token || !currentUser) {
    return (
      <DirectionProvider dir={i18n.dir()}>
        <LoginView onLoginSuccess={handleLoginSuccess} />
        <Toaster />
      </DirectionProvider>
    )
  }

  return (
    <DirectionProvider dir={i18n.dir()}>
      <div className="fixed inset-0 flex h-dvh w-full bg-background text-foreground overflow-hidden">
        {/* Desktop Sidebar Navigation */}
        <AppSidebar
          currentUser={currentUser}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          navItems={desktopNavItems}
          syncAction={renderWebtopSyncButton()}
          version={__APP_VERSION__}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
          {/* Mobile Header */}
          <MobileHeader
            title={t(`${activeTab}.title`)}
            titleKey={`mobile-header-title-${activeTab}`}
            avatarUrl={currentUser.avatar}
            username={currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : currentUser.username}
            onAvatarClick={() => handleTabChange('account')}
            isAccountActive={activeTab === 'account'}
            isScrolled={Boolean(isScrolled || isScrolling)}
            action={renderWebtopSyncButton()}
          />

          {autoSyncPaused && (
            <NoticeBanner
              variant="warning"
              className="mx-3 mt-3 rounded-xl"
              title={t("account.webtop_auto_sync_paused_title")}
              description={t("account.webtop_auto_sync_paused_desc")}
            >
              {activeTab !== 'settings' && (
                <button
                  type="button"
                  onClick={() => handleTabChange('settings')}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {t("account.webtop_auto_sync_go_settings")}
                </button>
              )}
            </NoticeBanner>
          )}

          {/* Main Body */}
          <main className="flex-1 min-h-0 overflow-hidden relative flex flex-col h-full">
            <div className="w-full flex-1 min-h-0 max-w-7xl mx-auto h-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <Suspense fallback={<LoadingSpinner />}>
                    {activeTab === 'homework' && <HomeworkPage token={token} syncTrigger={syncTrigger} currentUser={currentUser} />}
                    {activeTab === 'incidents' && <IncidentsPage token={token} syncTrigger={syncTrigger} currentUser={currentUser} />}
                    {activeTab === 'exams' && <ExamsPage token={token} syncTrigger={syncTrigger} currentUser={currentUser} />}
                    {activeTab === 'schedule' && <SchedulePage token={token} syncTrigger={syncTrigger} currentUser={currentUser} />}
                    {activeTab === 'settings' && <SettingsPage token={token} currentUser={currentUser} />}
                    {activeTab === 'admin' && currentUser.role === 'admin' && (
                      <AdminPage
                        currentUser={currentUser}
                        token={token}
                      />
                    )}
                    {activeTab === 'account' && (
                      <AccountPage
                        user={currentUser}
                        token={token}
                        onUpdateUser={(updated) => setCurrentUser(updated)}
                        onLogout={handleLogout}
                      />
                    )}
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

          {/* Mobile Bottom Navigation - Floating Liquid Glass Dock */}
          <LiquidDock
            items={mobileNavItems}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>
        <Toaster />
      </div>
    </DirectionProvider>
  )
}

export default App
