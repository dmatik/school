import { useMemo, useRef, type RefObject } from "react"
import { useTranslation } from "react-i18next"
import { Clock, Plus, Edit2, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { getChildColor } from "@/lib/child-colors"
import type { ScheduleLesson, ScheduleFinishTime } from "@/types"

export const SCHEDULE_DAYS = [0, 1, 2, 3, 4, 5] as const // Sunday to Friday

export type ScheduleTableLesson = Pick<ScheduleLesson, "dayOfWeek" | "hourNum" | "subject">
export type ScheduleTableFinishTime = Pick<ScheduleFinishTime, "dayOfWeek" | "finishTime">

export interface ScheduleTableProps {
  /** Lessons to render in the grid, keyed by dayOfWeek (0-5) and hourNum (1-12). */
  lessons: ScheduleTableLesson[]
  /** Dismissal finish times per dayOfWeek (HH:MM). */
  finishTimes: ScheduleTableFinishTime[]
  /** Child palette color id used to tint the header row and hour header slot. */
  childColorId?: string | null
  /** Current day of week (0 = Sunday ... 6 = Saturday). Defaults to today. */
  currentDayOfWeek?: number
  /** Edit mode shows one extra empty row below the highest populated lesson. */
  isEditMode?: boolean
  /** Whether cells are interactive (add/edit affordances, pointer cursor). */
  canEdit?: boolean
  /** Called when a lesson cell is clicked. */
  onLessonClick?: (dayOfWeek: number, hourNum: number) => void
  /** Called when a dismissal finish-time cell is clicked. */
  onFinishTimeClick?: (dayOfWeek: number) => void
  /** Optional external ref to the horizontally scrollable days container (mobile). */
  scrollContainerRef?: RefObject<HTMLDivElement | null>
  /** Optional external refs array to the day header columns (used for auto-scroll to a day). */
  dayColRefs?: RefObject<(HTMLDivElement | null)[]>
  className?: string
}

export function ScheduleTable({
  lessons,
  finishTimes,
  childColorId,
  currentDayOfWeek: currentDayOfWeekProp,
  isEditMode = false,
  canEdit = false,
  onLessonClick,
  onFinishTimeClick,
  scrollContainerRef: externalScrollRef,
  dayColRefs: externalDayColRefs,
  className
}: ScheduleTableProps) {
  const { t, i18n } = useTranslation()

  const internalScrollRef = useRef<HTMLDivElement | null>(null)
  const internalDayColRefs = useRef<(HTMLDivElement | null)[]>([])
  const scrollContainerRef = externalScrollRef ?? internalScrollRef
  const dayColRefs = externalDayColRefs ?? internalDayColRefs

  const todayDayOfWeek = useMemo(() => new Date().getDay(), [])
  const currentDayOfWeek = currentDayOfWeekProp ?? todayDayOfWeek

  const childColor = useMemo(() => getChildColor(childColorId), [childColorId])

  // Determine hours range:
  // In edit mode: always display 1 hour below the highest populated lesson in any day (min 1, max 12)
  // In view mode: do not display the last empty row, only show populated hours
  const hoursToDisplay = useMemo(() => {
    let maxPopulatedHour = 0
    for (const l of lessons) {
      if (l.subject && l.subject.trim() && l.hourNum > maxPopulatedHour) {
        maxPopulatedHour = l.hourNum
      }
    }
    const maxHour = isEditMode
      ? Math.min(Math.max(maxPopulatedHour + 1, 1), 12)
      : Math.min(maxPopulatedHour, 12)
    const list: number[] = []
    for (let h = 1; h <= maxHour; h++) {
      list.push(h)
    }
    return list
  }, [lessons, isEditMode])

  // Map lessons by [dayOfWeek][hourNum]
  const lessonMap = useMemo(() => {
    const map = new Map<string, ScheduleTableLesson>()
    for (const l of lessons) {
      map.set(`${l.dayOfWeek}-${l.hourNum}`, l)
    }
    return map
  }, [lessons])

  // Map finish times by dayOfWeek
  const finishTimeMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const f of finishTimes) {
      map.set(f.dayOfWeek, f.finishTime)
    }
    return map
  }, [finishTimes])

  const scrollDay = (direction: "prev" | "next") => {
    if (!scrollContainerRef.current) return
    const container = scrollContainerRef.current
    const scrollAmount = container.clientWidth / 3
    const isRtl = i18n.dir() === "rtl"
    const scrollDelta =
      direction === "next"
        ? isRtl
          ? -scrollAmount
          : scrollAmount
        : isRtl
          ? scrollAmount
          : -scrollAmount
    container.scrollBy({
      left: scrollDelta,
      behavior: "smooth"
    })
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Mobile navigation hints (Left/Right scroll controls) */}
      <div className="md:hidden flex items-center justify-between pb-2 px-1 text-xs text-muted-foreground font-medium">
        <button
          onClick={() => scrollDay("prev")}
          className="flex items-center gap-1 hover:text-foreground p-1 rounded-md transition-colors"
          title={t("schedule.scroll_backward")}
          aria-label={t("schedule.scroll_backward")}
        >
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
        </button>
        <span className="text-[11px] font-medium opacity-80 select-none">
          {t("schedule.days.day_0")} – {t("schedule.days.day_5")}
        </span>
        <button
          onClick={() => scrollDay("next")}
          className="flex items-center gap-1 hover:text-foreground p-1 rounded-md transition-colors"
          title={t("schedule.scroll_forward")}
          aria-label={t("schedule.scroll_forward")}
        >
          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
        </button>
      </div>

      {/* Schedule Table Container */}
      <div className="w-full border border-border/80 bg-card/80 rounded-xl sm:rounded-2xl shadow-xs overflow-hidden flex">
        {/* Frozen First Column: # and Hours */}
        <div className="w-9 sm:w-12 shrink-0 border-e border-border/70 flex flex-col z-10 select-none">
          {/* Hour header slot */}
          <div
            className={cn(
              "h-10 border-b border-border/80 flex items-center justify-center font-bold text-xs transition-colors",
              childColor ? cn(childColor.bg, "text-white") : "bg-primary text-primary-foreground"
            )}
          >
            {t("schedule.hour_col_header")}
          </div>
          {/* Hour slots */}
          <div className="flex flex-col divide-y divide-border/60">
            {hoursToDisplay.map((hourNum) => (
              <div
                key={hourNum}
                className="h-[48px] sm:h-[52px] flex items-center justify-center font-bold text-xs sm:text-sm text-muted-foreground bg-card/95"
              >
                <span>{hourNum}</span>
              </div>
            ))}
          </div>
          {/* Finish time icon slot */}
          <div className="h-[48px] sm:h-[52px] border-t border-border/80 flex items-center justify-center text-primary bg-muted/95 dark:bg-secondary/95">
            <Clock className="w-4 h-4 stroke-[2.2px]" />
          </div>
        </div>

        {/* Days Scrollable Area */}
        <div
          ref={scrollContainerRef}
          style={{
            overflowY: "hidden",
            overscrollBehaviorX: "none",
            overscrollBehaviorY: "auto",
            WebkitOverflowScrolling: "touch",
            touchAction: "manipulation"
          }}
          className="flex-1 overflow-x-auto overflow-y-hidden md:overflow-x-hidden no-scrollbar snap-x snap-mandatory min-w-0 overscroll-x-none touch-manipulation"
        >
          <div className="w-[200%] min-w-[200%] max-w-[200%] md:w-full md:min-w-full md:max-w-full flex flex-col">
            {/* Table Header: Days of the week */}
            <div
              data-schedule-header
              className={cn(
                "h-10 backdrop-blur-md border-b border-border/80 flex shrink-0 divide-x rtl:divide-x-reverse transition-colors",
                childColor ? cn(childColor.bg, "text-white divide-white/20") : "bg-primary text-primary-foreground divide-primary-foreground/20"
              )}
            >
              {SCHEDULE_DAYS.map((day) => {
                const isToday = currentDayOfWeek === day
                return (
                  <div
                    key={day}
                    ref={(el) => {
                      dayColRefs.current[day] = el
                    }}
                    data-schedule-day={day}
                    className={cn(
                      "w-[calc(100%/6)] min-w-[calc(100%/6)] max-w-[calc(100%/6)] shrink-0 snap-start",
                      "flex flex-col items-center justify-center py-2 px-1 text-center transition-colors min-w-0 max-w-full overflow-hidden",
                      isToday && (childColor ? "bg-black/15 dark:bg-black/25" : "bg-black/15 text-primary-foreground")
                    )}
                  >
                    <div className="flex items-center gap-1 min-w-0 max-w-full">
                      <span className="font-bold text-xs sm:text-sm truncate text-white">
                        {t(`schedule.days.day_${day}`)}
                      </span>
                      {isToday && (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white text-zinc-900 shadow-xs leading-tight shrink-0">
                          {t("schedule.today_badge")}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Table Rows: Lessons (1..N) */}
            <div className="flex flex-col divide-y divide-border/60">
              {hoursToDisplay.map((hourNum) => (
                <div
                  key={hourNum}
                  className="h-[48px] sm:h-[52px] max-h-[48px] sm:max-h-[52px] flex shrink-0 divide-x rtl:divide-x-reverse divide-border/70"
                >
                  {SCHEDULE_DAYS.map((day) => {
                    const lesson = lessonMap.get(`${day}-${hourNum}`)
                    const isToday = currentDayOfWeek === day

                    return (
                      <div
                        key={day}
                        onClick={canEdit ? () => onLessonClick?.(day, hourNum) : undefined}
                        className={cn(
                          "w-[calc(100%/6)] min-w-[calc(100%/6)] max-w-[calc(100%/6)] shrink-0 snap-start p-1 sm:p-1.5 flex items-center justify-center text-center transition-all min-w-0 max-w-full overflow-hidden h-[48px] sm:h-[52px] max-h-[48px] sm:max-h-[52px]",
                          isToday && "bg-primary/[0.02]",
                          canEdit
                            ? "cursor-pointer hover:bg-accent/40 active:scale-[0.99]"
                            : "cursor-default"
                        )}
                      >
                        {lesson ? (
                          <span
                            className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 break-words [word-break:break-word] [overflow-wrap:anywhere] leading-tight max-w-full text-center px-1 select-none"
                            title={lesson.subject}
                          >
                            {lesson.subject}
                          </span>
                        ) : canEdit ? (
                          <div className="w-full h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-muted-foreground/40">
                            <Plus className="w-3.5 h-3.5" />
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Bottom Row: School Dismissal Finish Time */}
            <div
              data-schedule-dismissal
              className="h-[48px] sm:h-[52px] max-h-[48px] sm:max-h-[52px] border-t border-border/80 bg-muted/90 dark:bg-secondary/90 backdrop-blur-md flex shrink-0 divide-x rtl:divide-x-reverse divide-border/70"
            >
              {SCHEDULE_DAYS.map((day) => {
                const finishTime = finishTimeMap.get(day)
                const isToday = currentDayOfWeek === day

                return (
                  <div
                    key={day}
                    onClick={canEdit ? () => onFinishTimeClick?.(day) : undefined}
                    className={cn(
                      "w-[calc(100%/6)] min-w-[calc(100%/6)] max-w-[calc(100%/6)] shrink-0 snap-start py-1 sm:py-1.5 px-1 sm:px-2 flex flex-col items-center justify-center transition-all min-w-0 max-w-full overflow-hidden h-[48px] sm:h-[52px] max-h-[48px] sm:max-h-[52px]",
                      isToday && "bg-primary/5",
                      canEdit
                        ? "cursor-pointer hover:bg-accent/50 active:scale-[0.98]"
                        : "cursor-default"
                    )}
                    title={canEdit ? t("schedule.finish_time_edit") : undefined}
                  >
                    <div className="flex items-center gap-1 min-w-0 max-w-full">
                      <span
                        className={cn(
                          "text-xs sm:text-sm font-bold tabular-nums tracking-tight truncate",
                          finishTime ? "text-foreground" : "text-muted-foreground/50"
                        )}
                      >
                        {finishTime || "--:--"}
                      </span>
                      {canEdit && (
                        <Edit2 className="w-3 h-3 text-muted-foreground/70 hover:text-foreground opacity-60 hover:opacity-100 transition-opacity shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground/80 font-medium truncate max-w-full">
                      {t("schedule.finish_time_row")}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
