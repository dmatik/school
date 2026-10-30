"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { he, enUS } from "date-fns/locale"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    const { i18n } = useTranslation()
    const isRtl = i18n.dir() === 'rtl'

    return (
        <DayPicker
            locale={isRtl ? he : enUS}
            dir={isRtl ? 'rtl' : 'ltr'}
            showOutsideDays={showOutsideDays}
            className={cn("p-3 pointer-events-auto", className)}
            classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-y-0",
                month: "space-y-4 relative mx-2",
                month_caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium",
                nav: "flex items-center",
                button_previous: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                    "absolute top-2 start-2 z-10"
                ),
                button_next: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                    "absolute top-2 end-2 z-10"
                ),
                month_grid: "w-full border-collapse space-y-1",
                weekdays: "flex justify-center",
                weekday:
                    "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center",
                week: "flex w-full mt-1.5 justify-center",
                day: "h-9 w-9 p-0 text-center text-sm relative flex items-center justify-center focus-within:relative focus-within:z-20",
                day_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-8 w-8 p-0 font-normal aria-selected:opacity-100 rounded-md transition-colors"
                ),
                range_end: "day-range-end",
                selected:
                    "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground [&>button]:focus:bg-primary [&>button]:focus:text-primary-foreground [&>button]:rounded-md",
                today: "font-bold [&>button]:rounded-md [&>button:not([aria-selected='true'])]:border [&>button:not([aria-selected='true'])]:border-primary/60 [&>button:not([aria-selected='true'])]:text-primary [&>button:not([aria-selected='true'])]:bg-primary/10",
                outside:
                    "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                disabled: "text-muted-foreground opacity-50",
                range_middle:
                    "aria-selected:bg-accent aria-selected:text-accent-foreground",
                hidden: "invisible",
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation }) => {
                    const Icon = orientation === "left"
                        ? (isRtl ? ChevronRight : ChevronLeft)
                        : (isRtl ? ChevronLeft : ChevronRight)
                    return <Icon className="h-4 w-4" />
                },
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
