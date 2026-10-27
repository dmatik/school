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
}

export function DatePicker({
    date,
    setDate,
    placeholder,
    className,
    disabled,
    clearable = true
}: DatePickerProps) {
    const { t, i18n } = useTranslation()
    const isRtl = i18n.dir() === 'rtl'
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false)

    const handleSelect = (newDate: Date | undefined) => {
        setDate(newDate)
        setIsPopoverOpen(false)
    }

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        setDate(undefined)
    }

    return (
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <div className="relative inline-flex items-center w-full">
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-start font-normal gap-2 h-9 text-xs px-3",
                            !date && "text-muted-foreground",
                            clearable && date && "pe-7",
                            className
                        )}
                    >
                        <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                            {date ? format(date, t('common.date_format'), { locale: isRtl ? he : enUS }) : (placeholder || t('common.select_date'))}
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
                    defaultMonth={date || new Date()}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    )
}
