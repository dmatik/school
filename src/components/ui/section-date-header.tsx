import * as React from "react"
import { he, enUS } from "date-fns/locale"
import { useTranslation } from "react-i18next"
import { cn, formatSectionDate } from "@/lib/utils"

export interface SectionDateHeaderProps
  extends React.HTMLAttributes<HTMLHeadingElement> {
  date?: string | Date | null
  as?: "h2" | "h3" | "h4" | "div" | "span"
  containerClassName?: string
  fallback?: React.ReactNode
}

export function SectionDateHeader({
  date,
  as: Component = "h2",
  containerClassName,
  fallback,
  className,
  children,
  ...props
}: SectionDateHeaderProps) {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.dir() === "rtl"
  const dateLocale = isRtl ? he : enUS

  const formattedDate = React.useMemo(() => {
    if (children) return children
    const resolved = formatSectionDate(date, { t, locale: dateLocale })
    if (resolved) return resolved
    if (fallback) return fallback
    if (typeof date === "string" && date !== "no-date") return date
    return null
  }, [date, t, dateLocale, children, fallback])

  if (!formattedDate) return null

  return (
    <div className={cn("flex justify-start pt-1 pb-1 px-1", containerClassName)}>
      <Component
        className={cn(
          "text-sm sm:text-base font-semibold text-muted-foreground tracking-tight select-none text-start",
          className
        )}
        {...props}
      >
        {formattedDate}
      </Component>
    </div>
  )
}
