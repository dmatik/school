"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { format, isToday, isYesterday } from "date-fns"
import { he, enUS } from "date-fns/locale"
import { DatePicker } from "@/components/ui/date-picker"

export interface LiquidDatePickerProps {
  date?: Date
  setDate: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: (date: Date) => boolean
  disableFuture?: boolean
  clearable?: boolean
  align?: "start" | "end" | "center"
  isChild?: boolean
  formatPattern?: string
  formatDisplay?: (date: Date) => { short?: string; full?: string } | string
}

export function LiquidDatePicker({
  date,
  setDate,
  placeholder,
  className,
  disabled,
  disableFuture = true,
  clearable = true,
  align = "start",
  isChild = false,
  formatPattern,
  formatDisplay
}: LiquidDatePickerProps) {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.dir() === "rtl"
  const dateLocale = isRtl ? he : enUS

  const isFutureDate = React.useCallback((d: Date) => {
    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)
    return d > endOfToday
  }, [])

  const disabledFilter = React.useCallback(
    (d: Date) => {
      if (disabled && disabled(d)) return true
      if (disableFuture && isFutureDate(d)) return true
      return false
    },
    [disabled, disableFuture, isFutureDate]
  )

  const defaultFormatDisplay = React.useCallback(
    (d: Date) => {
      if (formatDisplay) {
        return formatDisplay(d)
      }

      let full = ""
      try {
        if (isToday(d)) {
          full = t("common.today")
        } else if (isYesterday(d)) {
          full = t("common.yesterday")
        } else {
          full = format(d, formatPattern || "EEEE, PPP", { locale: dateLocale })
        }
      } catch {
        full = d.toLocaleDateString()
      }

      const short = format(d, "dd/MM/yyyy")
      if (isChild) {
        return { short: full, full }
      }
      return { short, full }
    },
    [dateLocale, formatDisplay, formatPattern, isChild, t]
  )

  return (
    <DatePicker
      variant="liquid"
      date={date}
      setDate={setDate}
      placeholder={placeholder || t("common.all_dates")}
      disabled={disabledFilter}
      clearable={clearable}
      formatDisplay={defaultFormatDisplay}
      align={align}
      className={className}
    />
  )
}
