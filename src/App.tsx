import { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy, useId } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertCircle,
  BookOpen,
  Shield,
  Settings as SettingsIcon,
  User as UserIcon,
  Loader2,
  RefreshCw,
  Check,
  FileCheck,
  CalendarDays,
  type LucideIcon
} from "lucide-react"
import { Toaster } from "@/components/ui/toaster"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
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

  const mobileNavItems = useMemo(() => {
    const items: {
      tab: AppTab;
      icon: LucideIcon | React.ComponentType<{ className?: string }>;
      activeIcon?: React.ComponentType<{ className?: string }>;
      label: string;
    }[] = [
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
      }
    } catch {
      // ignore
    }
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
  }, [t])

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

  const renderWebtopSyncButton = () => {
    if (!webtopConfigured) return null
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSync}
        disabled={syncing}
        className={cn(
          "h-9 w-9 rounded-full transition-colors disabled:opacity-100 disabled:bg-transparent",
          syncSuccess
            ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
            : "hover:bg-accent"
        )}
        title={
          syncSuccess
            ? (syncSummary || t("common.sync_success"))
            : syncing
              ? t("common.syncing")
              : t("common.sync_now")
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          {syncSuccess ? (
            <motion.div
              key="check"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center text-emerald-600 dark:text-emerald-400"
            >
              <Check className="w-6 h-6 stroke-[2.5px]" />
            </motion.div>
          ) : (
            <motion.div
              key="refresh"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center"
            >
              <RefreshCw className={cn("w-6 h-6 stroke-[2px]", syncing && "animate-spin")} />
            </motion.div>
          )}
        </AnimatePresence>
        <span className="sr-only">
          {syncSuccess
            ? t("common.sync_success")
            : syncing
              ? t("common.syncing")
              : t("common.sync_now")}
        </span>
      </Button>
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
        <aside className="hidden md:flex flex-col w-64 border-e border-border/80 bg-card/95 backdrop-blur-md shrink-0">
          {/* Header with App Title and User Profile shortcut */}
          <div className="p-4 border-b border-border/80 flex items-center gap-3">
            <button
              onClick={() => handleTabChange('account')}
              className={cn(
                "relative rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 shrink-0",
                activeTab === 'account' ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:opacity-85"
              )}
              title={t('common.account')}
            >
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.username}
                  className="w-9 h-9 rounded-full object-cover border border-transparent shadow-xs"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm border border-transparent shadow-xs">
                  {currentUser.username[0]?.toUpperCase() || <UserIcon className="w-4 h-4" />}
                </div>
              )}
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-extrabold bg-gradient-to-r from-[#3B82C4] to-[#555DB0] dark:from-[#6BA3D8] dark:to-[#8E94DB] bg-clip-text text-transparent truncate tracking-tight">
                {t('common.app_title')}
              </h1>
              <div className="text-xs text-muted-foreground truncate font-medium">
                {currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : currentUser.username}
              </div>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            <MenuButton
              active={activeTab === 'homework'}
              onClick={() => handleTabChange('homework')}
              icon={BookOpen}
              activeIcon={BookOpenFull}
              label={t('common.homework')}
            />
            <MenuButton
              active={activeTab === 'incidents'}
              onClick={() => handleTabChange('incidents')}
              icon={AlertCircle}
              activeIcon={AlertCircleFull}
              label={t('common.incidents')}
            />
            <MenuButton
              active={activeTab === 'exams'}
              onClick={() => handleTabChange('exams')}
              icon={FileCheck}
              activeIcon={FileCheckFull}
              label={t('common.exams')}
            />
            <MenuButton
              active={activeTab === 'schedule'}
              onClick={() => handleTabChange('schedule')}
              icon={CalendarDays}
              activeIcon={CalendarDaysFull}
              label={t('common.schedule')}
            />
            <MenuButton
              active={activeTab === 'settings'}
              onClick={() => handleTabChange('settings')}
              icon={SettingsIcon}
              activeIcon={SettingsFull}
              label={t('common.settings')}
            />
            {currentUser.role === 'admin' && (
              <MenuButton
                active={activeTab === 'admin'}
                onClick={() => handleTabChange('admin')}
                icon={Shield}
                label={t('common.admin')}
              />
            )}
          </nav>

          {/* Desktop Footer Controls */}
          <div className="p-3 border-t border-border/80 flex items-center justify-between bg-card/60">
            <div className="flex items-center gap-2">
              {renderWebtopSyncButton()}
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              v{__APP_VERSION__}
            </span>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
          {/* Mobile Header */}
          <header
            className={cn(
              "md:hidden fixed top-0 inset-x-0 z-30 px-4 py-2.5 grid grid-cols-[2.25rem_1fr_2.25rem] items-center gap-2 bg-background transition-all duration-300",
              (isScrolled || isScrolling)
                ? "border-b border-border/50 shadow-xs"
                : "border-b border-transparent shadow-none"
            )}
          >
            <button
              onClick={() => handleTabChange('account')}
              className={cn(
                "relative w-9 h-9 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 shrink-0",
                activeTab === 'account' ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:opacity-85"
              )}
              title={t('common.account')}
            >
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.username}
                  className="w-9 h-9 rounded-full object-cover border border-transparent shadow-xs"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm border border-transparent shadow-xs">
                  {currentUser.username[0]?.toUpperCase() || <UserIcon className="w-4 h-4" />}
                </div>
              )}
            </button>

            <div className="min-w-0 flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.h1
                  key={`mobile-header-title-${activeTab}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="text-lg font-bold tracking-tight text-foreground truncate text-center"
                >
                  {t(`${activeTab}.title`)}
                </motion.h1>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-end w-9 h-9 shrink-0">
              {renderWebtopSyncButton()}
            </div>
          </header>

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
          <nav
            aria-label="Mobile Navigation"
            className={cn(
              "md:hidden fixed bottom-[max(0.625rem,calc(env(safe-area-inset-bottom)-10px))] inset-x-0 mx-auto z-30 p-1.5 rounded-full apple-liquid-dock transition-all duration-300",
              mobileNavItems.length > 5
                ? "w-[min(352px,calc(100vw-1.5rem))] overflow-x-auto no-scrollbar"
                : "w-fit max-w-[calc(100vw-1.5rem)]"
            )}
          >
            <div className={cn("flex items-center relative", mobileNavItems.length >= 5 && "w-max")}>
              {mobileNavItems.map((item) => (
                <MobileNavButton
                  key={item.tab}
                  active={activeTab === item.tab}
                  onClick={() => handleTabChange(item.tab)}
                  icon={item.icon}
                  activeIcon={item.activeIcon}
                  label={item.label}
                  isFiveOrMore={mobileNavItems.length >= 5}
                />
              ))}
            </div>
          </nav>
        </div>
        <Toaster />
      </div>
    </DirectionProvider>
  )
}

function BookOpenFull({ className }: { className?: string }) {
  const maskId = useId()
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill="white" />
          <path d="M12 7v14" stroke="black" strokeWidth="2" strokeLinecap="round" />
        </mask>
      </defs>
      <path
        d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"
        mask={`url(#${maskId})`}
      />
    </svg>
  )
}

function CalendarDaysFull({ className }: { className?: string }) {
  const maskId = useId()
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill="white" />
          <path d="M3 10h18" stroke="black" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 14h.01" stroke="black" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 14h.01" stroke="black" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 14h.01" stroke="black" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 18h.01" stroke="black" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 18h.01" stroke="black" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 18h.01" stroke="black" strokeWidth="2" strokeLinecap="round" />
        </mask>
      </defs>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect
        width="18"
        height="18"
        x="3"
        y="4"
        rx="2"
        fill="currentColor"
        mask={`url(#${maskId})`}
      />
    </svg>
  )
}

function AlertCircleFull({ className }: { className?: string }) {
  const maskId = useId()
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill="white" />
          <line x1="12" y1="8" x2="12" y2="12" stroke="black" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="16" x2="12.01" y2="16" stroke="black" strokeWidth="2" strokeLinecap="round" />
        </mask>
      </defs>
      <circle cx="12" cy="12" r="10" mask={`url(#${maskId})`} />
    </svg>
  )
}

function SettingsFull({ className }: { className?: string }) {
  const maskId = useId()
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill="white" />
          <circle cx="12" cy="12" r="3" fill="black" stroke="black" strokeWidth="2" />
        </mask>
      </defs>
      <path
        d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"
        mask={`url(#${maskId})`}
      />
    </svg>
  )
}

function FileCheckFull({ className }: { className?: string }) {
  const maskId = useId()
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill="white" />
          {/* Folded corner crease line cutout */}
          <path
            d="M14 2v5a1 1 0 0 0 1 1h5"
            stroke="black"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Center checkmark cutout */}
          <path
            d="m9 15 2 2 4-4"
            stroke="black"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </mask>
      </defs>
      <path
        d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"
        mask={`url(#${maskId})`}
      />
    </svg>
  )
}

function MenuButton({
  active,
  onClick,
  icon: Icon,
  activeIcon: ActiveIcon,
  label
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  activeIcon?: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  const IconComponent = (active && ActiveIcon) ? ActiveIcon : Icon
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full h-10 px-3.5 rounded-full text-sm font-semibold transition-colors duration-200 border border-transparent",
        active
          ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary shadow-xs"
          : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
      )}
    >
      <IconComponent className={cn("w-4 h-4 shrink-0 transition-all", active ? "stroke-[2px] dock-icon-full text-primary" : "text-muted-foreground")} />
      <span className="truncate">{label}</span>
    </motion.button>
  )
}

function MobileNavButton({
  active,
  onClick,
  icon: Icon,
  activeIcon: ActiveIcon,
  label,
  isFiveOrMore
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  activeIcon?: React.ComponentType<{ className?: string }>;
  label: string;
  isFiveOrMore?: boolean;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (active && buttonRef.current) {
      buttonRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      })
    }
  }, [active])

  const IconComponent = (active && ActiveIcon) ? ActiveIcon : Icon

  return (
    <motion.button
      ref={buttonRef}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className={cn(
        "shrink-0 relative flex flex-col items-center justify-center py-2 px-1 rounded-full transition-colors select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        isFiveOrMore ? "w-[68px]" : "w-[85px]",
        active ? "text-primary" : "text-foreground"
      )}
    >
      {active && (
        <motion.div
          layoutId="liquidGlassPill"
          transition={{
            type: "spring",
            stiffness: 450,
            damping: 35,
          }}
          className="absolute -inset-0.5 rounded-full apple-liquid-pill"
        />
      )}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <IconComponent className={cn("stroke-[2px] w-6 h-6 transition-all", active ? "dock-icon-full text-primary" : "fill-none")} />
        <span className={cn(
          "text-[10px] leading-none mt-1 truncate font-medium transition-colors",
          isFiveOrMore ? "max-w-[62px]" : "max-w-[76px]",
          active ? "text-primary font-semibold" : "text-foreground"
        )}>
          {label}
        </span>
      </div>
    </motion.button>
  )
}

export default App
