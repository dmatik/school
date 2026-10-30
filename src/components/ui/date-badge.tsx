import * as React from "react"
import { format } from "date-fns"
import { he, enUS } from "date-fns/locale"
import { useTranslation } from "react-i18next"
import { Calendar } from "lucide-react"
import { cn, parseLocalDate } from "@/lib/utils"

export interface DateBadgeProps {
  date?: string | Date | null
  className?: string
}

export function DateBadge({ date, className }: DateBadgeProps) {
  const { i18n } = useTranslation()
  const isRtl = i18n.dir() === "rtl"
  const dateLocale = isRtl ? he : enUS

  const dateObj = React.useMemo(() => {
    if (!date) return null
    return parseLocalDate(date)
  }, [date])

  const weekDay = React.useMemo(() => {
    if (!dateObj) return ""
    try {
      return format(dateObj, "EEEE", { locale: dateLocale })
    } catch {
      return ""
    }
  }, [dateObj, dateLocale])

  const formattedDate = React.useMemo(() => {
    if (!dateObj) return ""
    try {
      return format(dateObj, "PPP", { locale: dateLocale })
    } catch {
      return ""
    }
  }, [dateObj, dateLocale])

  if (!dateObj || !formattedDate) return null

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2.5 py-1 rounded-lg bg-muted/60 border border-border/50 shrink-0",
        className
      )}
    >
      <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="flex flex-col text-start">
        <span className="text-xs sm:text-sm font-bold text-foreground leading-tight">
          {weekDay}
        </span>
        <span className="text-xs text-muted-foreground leading-tight">
          {formattedDate}
        </span>
      </div>
    </div>
  )
}

