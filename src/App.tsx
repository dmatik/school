import { useState, useEffect, Suspense, lazy } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertCircle,
  BookOpen,
  Shield,
  User as UserIcon,
  Loader2,
  type LucideIcon
} from "lucide-react"
import { Toaster } from "@/components/ui/toaster"
import { cn } from "@/lib/utils"
import type { User } from "@/types"
import { ModeToggle } from "@/components/mode-toggle"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { LoginView } from "@/components/LoginView"
import { useTranslation } from "react-i18next"
import { DirectionProvider } from "@radix-ui/react-direction"

// Lazy load views
const IncidentsPage = lazy(() => import("@/components/IncidentsPage").then(module => ({ default: module.IncidentsPage })))
const HomeworkPage = lazy(() => import("@/components/HomeworkPage").then(module => ({ default: module.HomeworkPage })))
const AccountPage = lazy(() => import("@/components/AccountPage").then(module => ({ default: module.AccountPage })))
const AdminPage = lazy(() => import("@/components/AdminPage").then(module => ({ default: module.AdminPage })))

const LoadingSpinner = () => (
  <div className="flex h-full w-full items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
)

type AppTab = 'incidents' | 'homework' | 'admin' | 'account'

function App() {
  const { t, i18n } = useTranslation()
  const [activeTab, setActiveTab] = useState<AppTab>('incidents')

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
        role: 'admin'
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
    setActiveTab('incidents')
  }

  const handleLogout = () => {
    localStorage.removeItem("auth_token")
    setToken(null)
    setCurrentUser(null)
    setActiveTab('incidents')
  }

  // Update document title on language change
  useEffect(() => {
    document.title = t('common.app_title')
  }, [t, i18n.language])

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
      <div className="flex h-dvh w-full bg-background text-foreground overflow-hidden">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:flex flex-col w-64 border-e border-border bg-card/60 backdrop-blur-md shrink-0">
          {/* Header with App Title and User Profile shortcut */}
          <div className="p-4 border-b border-border flex items-center gap-3">
            <button
              onClick={() => setActiveTab('account')}
              className={cn(
                "relative rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 shrink-0",
                activeTab === 'account' ? "ring-2 ring-primary ring-offset-2" : "hover:opacity-85"
              )}
              title={t('common.account')}
            >
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.username}
                  className="w-9 h-9 rounded-full object-cover border border-border shadow-sm"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border border-primary/20 shadow-sm">
                  {currentUser.username[0]?.toUpperCase() || <UserIcon className="w-4 h-4" />}
                </div>
              )}
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate">
                {t('common.app_title')}
              </h1>
              <div className="text-[11px] text-muted-foreground truncate">
                {currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : currentUser.username}
              </div>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            <MenuButton
              active={activeTab === 'incidents'}
              onClick={() => setActiveTab('incidents')}
              icon={AlertCircle}
              label={t('common.incidents')}
            />
            <MenuButton
              active={activeTab === 'homework'}
              onClick={() => setActiveTab('homework')}
              icon={BookOpen}
              label={t('common.homework')}
            />
            {currentUser.role === 'admin' && (
              <MenuButton
                active={activeTab === 'admin'}
                onClick={() => setActiveTab('admin')}
                icon={Shield}
                label={t('common.admin')}
              />
            )}
          </nav>

          {/* Desktop Footer Controls */}
          <div className="p-4 border-t border-border flex items-center justify-between bg-card/40">
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ModeToggle />
            </div>
            <span className="text-[10px] text-muted-foreground">
              v{__APP_VERSION__}
            </span>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Mobile Header */}
          <header className="md:hidden bg-background/80 backdrop-blur-md border-b border-border z-20 px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setActiveTab('account')}
                className={cn(
                  "relative rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 shrink-0",
                  activeTab === 'account' ? "ring-2 ring-primary ring-offset-2" : "hover:opacity-85"
                )}
                title={t('common.account')}
              >
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.username}
                    className="w-8 h-8 rounded-full object-cover border border-border shadow-sm"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20 shadow-sm">
                    {currentUser.username[0]?.toUpperCase() || <UserIcon className="w-3.5 h-3.5" />}
                  </div>
                )}
              </button>

              <div className="flex flex-row items-baseline gap-2">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {t('common.app_title')}
                </h1>
                <span className="text-[10px] font-normal text-muted-foreground">
                  v{__APP_VERSION__}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ModeToggle />
            </div>
          </header>

          {/* Main Body */}
          <main className="flex-1 min-h-0 overflow-hidden relative flex flex-col">
            <div className="w-full flex-1 min-h-0 max-w-7xl mx-auto">
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
                    {activeTab === 'incidents' && <IncidentsPage token={token} />}
                    {activeTab === 'homework' && <HomeworkPage token={token} />}
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

          {/* Mobile Bottom Navigation */}
          <nav className="md:hidden bg-background/85 backdrop-blur-md border-t border-border pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pt-2 z-30 shadow-sm shrink-0">
            <div className="flex justify-around items-center">
              <MobileNavButton
                active={activeTab === 'incidents'}
                onClick={() => setActiveTab('incidents')}
                icon={AlertCircle}
                label={t('common.incidents')}
              />
              <MobileNavButton
                active={activeTab === 'homework'}
                onClick={() => setActiveTab('homework')}
                icon={BookOpen}
                label={t('common.homework')}
              />
              {currentUser.role === 'admin' && (
                <MobileNavButton
                  active={activeTab === 'admin'}
                  onClick={() => setActiveTab('admin')}
                  icon={Shield}
                  label={t('common.admin_short')}
                />
              )}
            </div>
          </nav>
        </div>
        <Toaster />
      </div>
    </DirectionProvider>
  )
}

function MenuButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: LucideIcon; label: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-lg text-lg font-medium transition-all duration-200 relative",
        active
          ? "bg-primary/10 text-primary shadow-sm border border-primary/20"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className={cn("w-5 h-5", active && "stroke-[2.5px]")} />
      <span>{label}</span>
      {active && (
        <motion.div
          layoutId="activeDesk"
          className="absolute start-0 w-1 h-6 bg-primary rounded-e-full"
        />
      )}
    </motion.button>
  )
}

function MobileNavButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: LucideIcon; label: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center w-full py-1 relative",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <div className={cn(
        "p-1.5 rounded-full transition-all duration-300",
        active ? "bg-primary/10" : "bg-transparent"
      )}>
        <Icon className={cn("w-5 h-5", active && "stroke-[2.5px]")} />
      </div>
      <span className="text-[11px] font-medium leading-none mt-1">{label}</span>
      {active && (
        <motion.div
          layoutId="activeTabMobile"
          className="absolute -top-1 w-1 h-1 bg-primary rounded-full"
        />
      )}
    </motion.button>
  )
}

export default App
