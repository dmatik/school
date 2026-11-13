import * as React from "react"
import { RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn, formatLastSyncedDateTime } from "@/lib/utils"

export interface LastSyncedLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  lastSyncedAt?: string | Date | null
}

/**
 * Displays a compact, centered "last synced" timestamp with a small sync icon
 * (e.g. `[sync icon] 13/11/2026 16:20`). Renders nothing when no valid timestamp is provided.
 */
export function LastSyncedLabel({
  lastSyncedAt,
  className,
  ...props
}: LastSyncedLabelProps) {
  const { t } = useTranslation()
  const formatted = formatLastSyncedDateTime(lastSyncedAt)
  if (!formatted) return null

  const accessibleLabel = t("common.last_sync", { date: formatted })

  return (
    <span
      data-last-synced
      aria-label={accessibleLabel}
      title={accessibleLabel}
      className={cn(
        "inline-block max-w-full text-[10px] leading-none text-muted-foreground truncate text-center font-normal",
        className
      )}
      {...props}
    >
      <RefreshCw className="inline-block w-2.5 h-2.5 align-[-0.125em] me-1 shrink-0" aria-hidden="true" />
      <span dir="ltr" className="tabular-nums">
        {formatted}
      </span>
    </span>
  )
}
