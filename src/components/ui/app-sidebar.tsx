import * as React from "react"
import { motion } from "framer-motion"
import { type LucideIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { UserAvatar } from "@/components/ui/user-avatar"
import { cn } from "@/lib/utils"

export {
  BookOpenFull,
  AlertCircleFull,
  CalendarDaysFull,
  SettingsFull,
  FileCheckFull,
} from "@/components/ui/nav-icons"

export interface SidebarNavItem<T extends string = string> {
  tab: T
  label: string
  icon: LucideIcon | React.ComponentType<{ className?: string }>
  activeIcon?: React.ComponentType<{ className?: string }>
  badge?: React.ReactNode
}

export interface AppSidebarUser {
  username: string
  firstName?: string | null
  lastName?: string | null
  avatar?: string | null
  role?: string
}

export interface SidebarNavButtonProps {
  active: boolean
  onClick: () => void
  icon: LucideIcon | React.ComponentType<{ className?: string }>
  activeIcon?: React.ComponentType<{ className?: string }>
  label: string
  badge?: React.ReactNode
  className?: string
}

export function SidebarNavButton({
  active,
  onClick,
  icon: Icon,
  activeIcon: ActiveIcon,
  label,
  badge,
  className,
}: SidebarNavButtonProps) {
  const IconComponent = active && ActiveIcon ? ActiveIcon : Icon
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full h-10 px-3.5 rounded-full text-sm font-semibold transition-colors duration-200 border border-transparent select-none",
        active
          ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary shadow-xs"
          : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
        className
      )}
    >
      <IconComponent
        className={cn(
          "w-4 h-4 shrink-0 transition-all",
          active ? "stroke-[2px] dock-icon-full text-primary" : "text-muted-foreground"
        )}
      />
      <span className="truncate flex-1 text-start">{label}</span>
      {badge}
    </motion.button>
  )
}

export interface AppSidebarProps<T extends string = string>
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  currentUser?: AppSidebarUser | null
  activeTab: T
  onTabChange: (tab: T) => void
  onProfileClick?: () => void
  accountTab?: T
  navItems: SidebarNavItem<T>[]
  title?: React.ReactNode
  syncAction?: React.ReactNode
  version?: string
}

export function AppSidebar<T extends string = string>({
  currentUser,
  activeTab,
  onTabChange,
  onProfileClick,
  accountTab,
  navItems,
  title,
  syncAction,
  version,
  className,
  ...props
}: AppSidebarProps<T>) {
  const { t } = useTranslation()

  const displayName = currentUser
    ? currentUser.firstName
      ? `${currentUser.firstName} ${currentUser.lastName || ""}`.trim()
      : currentUser.username
    : ""

  const handleProfileClick = () => {
    if (onProfileClick) {
      onProfileClick()
    } else {
      onTabChange(accountTab ?? ("account" as unknown as T))
    }
  }

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col w-64 border-e border-border/80 bg-card/95 backdrop-blur-md shrink-0",
        className
      )}
      {...props}
    >
      {/* Header with App Title and User Profile shortcut */}
      <div className="p-4 border-b border-border/80 flex items-center gap-3">
        {currentUser && (
          <button
            type="button"
            onClick={handleProfileClick}
            className={cn(
              "relative rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 shrink-0",
              activeTab === "account"
                ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                : "hover:opacity-85"
            )}
            title={t("common.account")}
            aria-label={t("common.account")}
          >
            <UserAvatar
              size="sm"
              avatarUrl={currentUser.avatar}
              name={displayName || currentUser.username}
              activeRing={false}
            />
          </button>
        )}

        <div className="min-w-0 flex-1">
          {title ?? (
            <h1 className="text-lg font-extrabold bg-gradient-to-r from-[#3B82C4] to-[#555DB0] dark:from-[#6BA3D8] dark:to-[#8E94DB] bg-clip-text text-transparent truncate tracking-tight">
              {t("common.app_title")}
            </h1>
          )}
          {currentUser && (
            <div className="text-xs text-muted-foreground truncate font-medium">
              {displayName}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Nav Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <SidebarNavButton
            key={item.tab}
            active={activeTab === item.tab}
            onClick={() => onTabChange(item.tab)}
            icon={item.icon}
            activeIcon={item.activeIcon}
            label={item.label}
            badge={item.badge}
          />
        ))}
      </nav>

      {/* Desktop Footer Controls */}
      {(syncAction || version) && (
        <div className="p-3 border-t border-border/80 flex items-center justify-between bg-card/60">
          <div className="flex items-center gap-2">{syncAction}</div>
          {version && (
            <span className="text-[10px] font-mono text-muted-foreground">
              v{version}
            </span>
          )}
        </div>
      )}
    </aside>
  )
}
