"use client"

import * as React from "react"
import { format } from "date-fns"
import { he, enUS } from "date-fns/locale"
import { useTranslation } from "react-i18next"
import { Calendar as CalendarIcon, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    date?: Date
    setDate: (date: Date | undefined) => void
    placeholder?: string
    className?: string
    disabled?: (date: Date) => boolean
    clearable?: boolean
    formatPattern?: string
    formatDisplay?: (date: Date) => { short?: string; full?: string } | string
    variant?: "default" | "liquid-icon" | "liquid"
    align?: "start" | "end" | "center"
}

export function DatePicker({
    date,
    setDate,
    placeholder,
    className,
    disabled,
    clearable = true,
    formatPattern = "EEEE, PPP",
    formatDisplay,
    variant = "default",
    align
}: DatePickerProps) {
    const { t, i18n } = useTranslation()
    const isRtl = i18n.dir() === 'rtl'
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false)
    const [calendarMonth, setCalendarMonth] = React.useState<Date>(() => date || new Date())

    React.useEffect(() => {
        if (isPopoverOpen) {
            setCalendarMonth(date || new Date())
        }
    }, [isPopoverOpen, date])

    const handleSelect = (newDate: Date | undefined) => {
        setDate(newDate)
        setIsPopoverOpen(false)
    }

    const handleToday = () => {
        const today = new Date()
        setCalendarMonth(today)
        handleSelect(today)
    }

    const isTodayDisabled = disabled ? disabled(new Date()) : false

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        setDate(undefined)
    }

    const formattedDate = React.useMemo(() => {
        if (!date) return placeholder || t('common.select_date')
        try {
            return format(date, formatPattern || t('common.date_format'), { locale: isRtl ? he : enUS })
        } catch {
            return date.toLocaleDateString()
        }
    }, [date, formatPattern, isRtl, placeholder, t])

    const displayDate = React.useMemo(() => {
        if (!date) {
            const fallback = placeholder || t('common.all_dates')
            return { short: fallback, full: fallback }
        }
        if (formatDisplay) {
            const res = formatDisplay(date)
            if (typeof res === "string") {
                return { short: res, full: res }
            }
            return {
                short: res.short || res.full || formattedDate,
                full: res.full || res.short || formattedDate
            }
        }
        try {
            const shortStr = format(date, "dd/MM/yyyy", { locale: isRtl ? he : enUS })
            const fullStr = format(date, formatPattern || t('common.date_format'), { locale: isRtl ? he : enUS })
            return { short: shortStr, full: fullStr }
        } catch {
            return { short: date.toLocaleDateString(), full: date.toLocaleDateString() }
        }
    }, [date, formatDisplay, formatPattern, formattedDate, isRtl, placeholder, t])

    const popoverAlign = align || (variant === "liquid-icon" ? "end" : "start")

    return (
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            {variant === "liquid-icon" ? (
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-10 w-10 rounded-full shadow-xs transition-all shrink-0 apple-liquid-dock focus:outline-none focus-visible:outline-none",
                            date
                                ? "border border-white/20 dark:border-white/10 !bg-primary text-primary-foreground hover:!bg-primary/90"
                                : "border border-transparent text-muted-foreground hover:text-foreground",
                            className
                        )}
                        title={formattedDate}
                        aria-label={formattedDate}
                        data-date-selected={!!date}
                    >
                        <CalendarIcon className={cn("w-5 h-5 stroke-[1.85px]", date ? "text-primary-foreground" : "text-muted-foreground")} />
                    </Button>
                </PopoverTrigger>
            ) : variant === "liquid" ? (
                <div className="relative inline-flex items-center">
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            className={cn(
                                "h-10 py-0 px-3.5 rounded-full border border-transparent shadow-xs transition-all shrink-0 apple-liquid-dock flex items-center gap-2 select-none focus:outline-none focus-visible:outline-none font-medium",
                                date
                                    ? "text-foreground"
                                    : "text-muted-foreground hover:text-foreground",
                                clearable && date && "pe-8",
                                className
                            )}
                            title={displayDate.full}
                            aria-label={displayDate.full}
                            data-date-selected={!!date}
                        >
                            <CalendarIcon className={cn("w-5 h-5 shrink-0 stroke-[1.85px] transition-colors", date ? "text-foreground" : "text-muted-foreground")} />
                            {displayDate.short !== displayDate.full ? (
                                <>
                                    <span className="md:hidden text-base whitespace-nowrap translate-y-px">
                                        {displayDate.short}
                                    </span>
                                    <span className="hidden md:inline text-base whitespace-nowrap translate-y-px">
                                        {displayDate.full}
                                    </span>
                                </>
                            ) : (
                                <span className="text-base whitespace-nowrap translate-y-px">
                                    {displayDate.full}
                                </span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    {clearable && date && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute end-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-10 flex items-center justify-center"
                            title={t('common.cancel')}
                            aria-label={t('common.cancel')}
                        >
                            <X className="w-3.5 h-3.5 stroke-[2.2px]" />
                        </button>
                    )}
                </div>
            ) : (
                <div className="relative inline-flex items-center w-full">
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-start font-normal gap-2 h-9 text-sm px-3 border-transparent shadow-xs focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-transparent focus-visible:border-transparent",
                                !date && "text-muted-foreground",
                                clearable && date && "pe-7",
                                className
                            )}
                        >
                            <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground -translate-y-[1px]" />
                            <span className="truncate leading-none">
                                {formattedDate}
                            </span>
                        </Button>
                    </PopoverTrigger>
                    {clearable && date && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute end-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors z-10 flex items-center justify-center"
                            title={t('common.cancel')}
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
            )}
            <PopoverContent className="w-auto p-0" align={popoverAlign}>
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleSelect}
                    disabled={disabled}
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    initialFocus
                />
                <div className="p-2 border-t border-border flex items-center justify-between gap-2 bg-muted/20">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isTodayDisabled}
                        className="text-xs h-7 px-2.5 font-medium text-primary hover:bg-primary/10 hover:text-primary disabled:opacity-40"
                        onClick={handleToday}
                    >
                        {t('common.today')}
                    </Button>
                    {clearable && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={!date}
                            className="text-xs h-7 px-2.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
                            onClick={() => handleSelect(undefined)}
                        >
                            {t('common.all_dates')}
                        </Button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
