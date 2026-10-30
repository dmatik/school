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
}

export function DatePicker({
    date,
    setDate,
    placeholder,
    className,
    disabled,
    clearable = true,
    formatPattern = "EEEE, PPP"
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

    return (
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <div className="relative inline-flex items-center w-full">
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-start font-normal gap-2 h-9 text-sm px-3",
                            !date && "text-muted-foreground",
                            clearable && date && "pe-7",
                            className
                        )}
                    >
                        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                            {formattedDate}
                        </span>
                    </Button>
                </PopoverTrigger>
                {clearable && date && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute end-2 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors z-10"
                        title={t('common.cancel')}
                    >
                        <X className="h-3 w-3" />
                    </button>
                )}
            </div>
            <PopoverContent className="w-auto p-0" align="start">
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
