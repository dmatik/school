import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslation } from "react-i18next"
import { UserAvatar } from "@/components/ui/user-avatar"
import { LastSyncedLabel } from "@/components/ui/last-synced-label"
import { cn, formatLastSyncedDateTime } from "@/lib/utils"

export { LastSyncedLabel, type LastSyncedLabelProps } from "@/components/ui/last-synced-label"

export interface MobileHeaderProps {
  title: React.ReactNode
  titleKey?: string
  lastSyncedAt?: string | Date | null
  avatarUrl?: string | null
  username?: string
  onAvatarClick?: () => void
  isAccountActive?: boolean
  isScrolled?: boolean
  action?: React.ReactNode
  className?: string
  fixed?: boolean
}

export function MobileHeader({
  title,
  titleKey,
  lastSyncedAt,
  avatarUrl,
  username,
  onAvatarClick,
  isAccountActive = false,
  isScrolled = false,
  action,
  className,
  fixed = true
}: MobileHeaderProps) {
  const { t } = useTranslation()
  const hasLastSynced = Boolean(formatLastSyncedDateTime(lastSyncedAt))

  return (
    <header
      className={cn(
        "px-4 py-2.5 grid grid-cols-[2.25rem_1fr_2.25rem] items-center gap-2 bg-background transition-all duration-300",
        fixed && "md:hidden fixed top-0 inset-x-0 z-30",
        isScrolled
          ? "border-b border-border/50 shadow-xs"
          : "border-b border-transparent shadow-none",
        className
      )}
    >
      <button
        type="button"
        onClick={onAvatarClick}
        className="rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 shrink-0 hover:opacity-85 select-none"
        title={t("common.account")}
        aria-label={t("common.account")}
      >
        <UserAvatar
          size="sm"
          avatarUrl={avatarUrl}
          name={username}
          activeRing={isAccountActive}
        />
      </button>

      <div className="min-w-0 h-9 flex flex-col items-center justify-center gap-0.5 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.h1
            key={titleKey || (typeof title === "string" ? title : undefined)}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "max-w-full text-lg font-bold tracking-tight text-foreground truncate text-center",
              hasLastSynced && "leading-none"
            )}
          >
            {title}
          </motion.h1>
        </AnimatePresence>
        <LastSyncedLabel lastSyncedAt={lastSyncedAt} />
      </div>

      <div className="flex items-center justify-end w-9 h-9 shrink-0">
        {action}
      </div>
    </header>
  )
}
