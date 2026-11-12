import { motion, AnimatePresence } from "framer-motion"
import { RefreshCw, Check } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface SyncButtonProps {
  onClick?: () => void
  syncing?: boolean
  success?: boolean
  summary?: string | null
  className?: string
  disabled?: boolean
  variant?: "icon" | "outline" | "pill"
  size?: "default" | "sm"
  label?: string
  syncingLabel?: string
  successLabel?: string
  iconPosition?: "start" | "end"
}

export function SyncButton({
  onClick,
  syncing = false,
  success = false,
  summary,
  className,
  disabled = false,
  variant = "icon",
  size = "sm",
  label,
  syncingLabel,
  successLabel,
  iconPosition = "end",
}: SyncButtonProps) {
  const { t } = useTranslation()

  if (variant === "outline" || variant === "pill") {
    const displayLabel = success
      ? (successLabel ?? t("account.webtop_synced"))
      : syncing
        ? (syncingLabel ?? t("account.webtop_syncing"))
        : (label ?? t("account.webtop_sync_button"))

    const iconEl = (
      <AnimatePresence mode="wait" initial={false}>
        {success ? (
          <motion.div
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center text-[#2CA58D] dark:text-[#9EE8D8] shrink-0"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5px]" />
          </motion.div>
        ) : (
          <motion.div
            key="refresh"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center shrink-0"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
          </motion.div>
        )}
      </AnimatePresence>
    )

    return (
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={onClick}
        disabled={disabled || syncing}
        className={cn(
          "text-xs flex items-center gap-1.5 rounded-full transition-colors",
          success && "border-[#2CA58D]/50 bg-[#2CA58D]/15 text-[#2CA58D] dark:bg-[#2CA58D]/25 dark:text-[#9EE8D8]",
          className
        )}
        title={success ? (summary || displayLabel) : displayLabel}
        aria-label={displayLabel}
      >
        {iconPosition === "start" ? (
          <>
            {iconEl}
            <span>{displayLabel}</span>
          </>
        ) : (
          <>
            <span>{displayLabel}</span>
            {iconEl}
          </>
        )}
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled || syncing}
      className={cn(
        "h-9 w-9 rounded-full transition-colors disabled:opacity-100 disabled:bg-transparent",
        success
          ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
          : "hover:bg-accent",
        className
      )}
      title={
        success
          ? (summary || t("common.sync_success"))
          : syncing
            ? t("common.syncing")
            : t("common.sync_now")
      }
      aria-label={
        success
          ? t("common.sync_success")
          : syncing
            ? t("common.syncing")
            : t("common.sync_now")
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {success ? (
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
        {success
          ? t("common.sync_success")
          : syncing
            ? t("common.syncing")
            : t("common.sync_now")}
      </span>
    </Button>
  )
}
