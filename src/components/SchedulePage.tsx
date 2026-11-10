import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { motion } from "framer-motion"
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Check
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { getChildColor } from "@/lib/child-colors"
import type { ScheduleLesson, ScheduleFinishTime, WebtopConfig, User as UserType } from "@/types"

interface SchedulePageProps {
  token?: string | null
  syncTrigger?: number
  currentUser?: UserType | null
}

const DAYS = [0, 1, 2, 3, 4, 5] as const // Sunday to Friday
const COMMON_FINISH_PRESETS = ["11:45", "12:45", "13:30", "14:15", "15:00", "16:00"]

export function SchedulePage({ token, syncTrigger, currentUser }: SchedulePageProps) {
  const { t, i18n } = useTranslation()
  const isChild = currentUser?.familyRole === "child"
  const isParent = !isChild

  const [lessons, setLessons] = useState<ScheduleLesson[]>([])
  const [finishTimes, setFinishTimes] = useState<ScheduleFinishTime[]>([])
  const [webtopConfig, setWebtopConfig] = useState<WebtopConfig | null>(null)
  const [selectedChildId, setSelectedChildId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [configLoaded, setConfigLoaded] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  // Mobile horizontal scroll ref and column refs
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const dayColRefs = useRef<(HTMLDivElement | null)[]>([])
  const lastScrolledChildId = useRef<string | null>(null)

  // Lesson Edit Modal state
  const [editingLesson, setEditingLesson] = useState<{
    dayOfWeek: number
    hourNum: number
    lesson?: ScheduleLesson
  } | null>(null)
  const [formSubject, setFormSubject] = useState("")

  // Finish Time Modal state
  const [editingFinishDay, setEditingFinishDay] = useState<number | null>(null)
  const [formFinishTime, setFormFinishTime] = useState("")

  // Determine current day of week (0 = Sunday, ..., 5 = Friday, 6 = Saturday)
  const currentDayOfWeek = useMemo(() => new Date().getDay(), [])

  // Calculate the target initial day to show on mobile (showing 3 days at a time):
  // If Wednesday (3), Thursday (4) or Friday (5): start at 3 (Wednesday), so [Wednesday, Thursday, Friday] are visible.
  // If Saturday (6): start at 0 (Sunday), so [Sunday, Monday, Tuesday] are visible.
  // Otherwise (0, 1, 2): start at current day.
  const initialTargetDay = useMemo(() => {
    if (currentDayOfWeek >= 3 && currentDayOfWeek <= 5) return 3
    if (currentDayOfWeek === 6) return 0
    if (currentDayOfWeek >= 0 && currentDayOfWeek <= 2) return currentDayOfWeek
    return 0
  }, [currentDayOfWeek])

  // Fetch Webtop config to discover linked children
  const loadConfig = useCallback(async () => {
    if (!token) return null
    try {
      const res = await fetch("/api/webtop/config", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const configData: WebtopConfig = await res.json()
        setWebtopConfig(configData)
        return configData
      }
    } catch (err) {
      console.error("Failed to load Webtop config:", err)
    }
    return null
  }, [token])

  // Initialize selected child
  useEffect(() => {
    loadConfig().then((cfg) => {
      if (isChild) {
        if (currentUser?.linkedChildId) {
          setSelectedChildId(currentUser.linkedChildId)
        } else {
          setLoading(false)
        }
      } else if (cfg?.linkedChildren && cfg.linkedChildren.length > 0) {
        setSelectedChildId((prev) => {
          if (prev && cfg.linkedChildren.some((c) => c.id === prev)) {
            return prev
          }
          if (cfg.selectedChildId && cfg.selectedChildId !== "all" && cfg.linkedChildren.some((c) => c.id === cfg.selectedChildId)) {
            return cfg.selectedChildId
          }
          return cfg.linkedChildren[0].id
        })
      } else {
        setLoading(false)
      }
      setConfigLoaded(true)
    })
  }, [loadConfig, isChild, currentUser?.linkedChildId])

  // Resolve active child and their accent color
  const currentChild = useMemo(() => {
    if (!webtopConfig?.linkedChildren || webtopConfig.linkedChildren.length === 0) return null
    if (selectedChildId) {
      return (
        webtopConfig.linkedChildren.find(
          (c) => c.id === selectedChildId || c.externalId === selectedChildId
        ) || null
      )
    }
    if (currentUser?.linkedChildId) {
      return (
        webtopConfig.linkedChildren.find(
          (c) => c.id === currentUser.linkedChildId || c.externalId === currentUser.linkedChildId
        ) || null
      )
    }
    return webtopConfig.linkedChildren[0] || null
  }, [webtopConfig, selectedChildId, currentUser?.linkedChildId])

  const childColor = useMemo(() => {
    return getChildColor(currentChild?.color)
  }, [currentChild?.color])

  // Load schedule data for current child
  const loadSchedule = useCallback(async (childId: string) => {
    if (!token || !childId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/schedule?childId=${encodeURIComponent(childId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setLessons(data.lessons || [])
        setFinishTimes(data.finishTimes || [])
      } else {
        toast({
          variant: "destructive",
          title: t("common.error"),
          description: t("schedule.fetch_failed")
        })
      }
    } catch (err) {
      console.error("Failed to load schedule:", err)
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("schedule.fetch_failed")
      })
    } finally {
      setLoading(false)
    }
  }, [token, t])

  useEffect(() => {
    if (!configLoaded) return
    if (selectedChildId) {
      loadSchedule(selectedChildId)
    } else {
      setLoading(false)
    }
  }, [configLoaded, selectedChildId, loadSchedule, syncTrigger])

  // Scroll mobile container to the initial target day on initial load and when switching children
  useEffect(() => {
    if (loading || !selectedChildId) return
    if (lastScrolledChildId.current === selectedChildId) return

    let cancelled = false

    const scrollToTargetDay = () => {
      if (cancelled) return
      const container = scrollContainerRef.current
      if (!container) return

      if (initialTargetDay === 0) {
        lastScrolledChildId.current = selectedChildId
        container.scrollTo({ left: 0, behavior: "instant" })
        return
      }

      const targetEl = dayColRefs.current[initialTargetDay]
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })
        lastScrolledChildId.current = selectedChildId
      } else {
        requestAnimationFrame(() => {
          if (cancelled) return
          const retryEl = dayColRefs.current[initialTargetDay]
          if (retryEl) {
            retryEl.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })
            lastScrolledChildId.current = selectedChildId
          }
        })
      }
    }

    const rafId = requestAnimationFrame(() => {
      scrollToTargetDay()
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
    }
  }, [loading, selectedChildId, initialTargetDay])

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
    const map = new Map<string, ScheduleLesson>()
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

  // Open Edit Lesson Modal
  const handleOpenLessonModal = (dayOfWeek: number, hourNum: number) => {
    if (!isParent || !isEditMode) return
    const existing = lessonMap.get(`${dayOfWeek}-${hourNum}`)
    setEditingLesson({ dayOfWeek, hourNum, lesson: existing })
    setFormSubject(existing?.subject || "")
  }

  // Child selection change handler: exit edit mode if active and re-trigger auto-scroll
  const handleSelectChild = (childId: string) => {
    if (isEditMode) {
      setIsEditMode(false)
    }
    if (childId !== selectedChildId) {
      lastScrolledChildId.current = null
      setLoading(true)
      setSelectedChildId(childId)
    }
  }

  // Save Lesson: updates local state and immediately persists to backend
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLesson || !token || !selectedChildId) return
    const cleanSubject = formSubject.trim().slice(0, 50)
    const prevLessons = lessons
    const targetDay = editingLesson.dayOfWeek
    const targetHour = editingLesson.hourNum

    // Optimistically update local state
    setLessons((prev) => {
      const filtered = prev.filter(
        (l) => !(l.dayOfWeek === targetDay && l.hourNum === targetHour)
      )
      if (cleanSubject) {
        return [
          ...filtered,
          {
            id: editingLesson.lesson?.id || `temp-${Date.now()}`,
            childId: selectedChildId,
            dayOfWeek: targetDay,
            hourNum: targetHour,
            subject: cleanSubject
          }
        ]
      }
      return filtered
    })
    setEditingLesson(null)

    try {
      const res = await fetch("/api/schedule/lesson", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          childId: selectedChildId,
          dayOfWeek: targetDay,
          hourNum: targetHour,
          subject: cleanSubject
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || data.error || t("schedule.save_failed"))
      }

      const data = await res.json()
      if (data.lesson) {
        setLessons((prev) =>
          prev.map((l) =>
            l.dayOfWeek === targetDay && l.hourNum === targetHour
              ? data.lesson
              : l
          )
        )
      }
    } catch (err: unknown) {
      console.error("Failed to save schedule lesson:", err)
      setLessons(prevLessons)
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("schedule.save_failed")
      })
    }
  }

  // Clear Lesson: updates local state and immediately persists to backend
  const handleClearLesson = async () => {
    if (!editingLesson || !token || !selectedChildId) return
    const prevLessons = lessons
    const targetDay = editingLesson.dayOfWeek
    const targetHour = editingLesson.hourNum

    // Optimistically update local state
    setLessons((prev) =>
      prev.filter(
        (l) => !(l.dayOfWeek === targetDay && l.hourNum === targetHour)
      )
    )
    setEditingLesson(null)

    try {
      const res = await fetch("/api/schedule/lesson", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          childId: selectedChildId,
          dayOfWeek: targetDay,
          hourNum: targetHour,
          subject: ""
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || data.error || t("schedule.save_failed"))
      }
    } catch (err: unknown) {
      console.error("Failed to clear schedule lesson:", err)
      setLessons(prevLessons)
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("schedule.save_failed")
      })
    }
  }

  // Open Finish Time Modal
  const handleOpenFinishModal = (dayOfWeek: number) => {
    if (!isParent || !isEditMode) return
    const existing = finishTimeMap.get(dayOfWeek) || ""
    setEditingFinishDay(dayOfWeek)
    setFormFinishTime(existing)
  }

  // Format HH:MM input cleanly on mobile numeric keypad & desktop
  const handleFinishTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (raw.length < formFinishTime.length && formFinishTime.startsWith(raw)) {
      setFormFinishTime(raw.endsWith(":") ? raw.slice(0, -1) : raw)
      return
    }
    if (/^\d:$/.test(raw)) {
      setFormFinishTime(`0${raw}`)
      return
    }
    const digits = raw.replace(/\D/g, "").slice(0, 4)
    if (digits.length <= 2) {
      setFormFinishTime(digits)
    } else {
      setFormFinishTime(`${digits.slice(0, 2)}:${digits.slice(2)}`)
    }
  }

  // Save Finish Time: updates local state and immediately persists to backend
  const handleSaveFinishTime = async (timeValue: string) => {
    if (editingFinishDay === null || !token || !selectedChildId) return
    const cleanTime = timeValue.trim()
    const targetDay = editingFinishDay
    const prevFinishTimes = finishTimes

    // Optimistically update local state
    setFinishTimes((prev) => {
      const filtered = prev.filter((f) => f.dayOfWeek !== targetDay)
      if (cleanTime) {
        return [
          ...filtered,
          {
            id: `temp-finish-${Date.now()}`,
            childId: selectedChildId,
            dayOfWeek: targetDay,
            finishTime: cleanTime
          }
        ]
      }
      return filtered
    })
    setEditingFinishDay(null)

    try {
      const res = await fetch("/api/schedule/finish-time", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          childId: selectedChildId,
          dayOfWeek: targetDay,
          finishTime: cleanTime
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || data.error || t("schedule.save_failed"))
      }

      const data = await res.json()
      if (data.finishTime) {
        setFinishTimes((prev) =>
          prev.map((f) => (f.dayOfWeek === targetDay ? data.finishTime : f))
        )
      }
    } catch (err: unknown) {
      console.error("Failed to save finish time:", err)
      setFinishTimes(prevFinishTimes)
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("schedule.save_failed")
      })
    }
  }

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
    <div className="relative h-full w-full overflow-hidden">
      <div className="h-full flex flex-col pt-[3.75rem] pb-[calc(max(0.625rem,env(safe-area-inset-bottom)-10px)+10rem)] px-4 md:pt-6 md:pb-28 md:px-6 overflow-y-auto gap-4 md:gap-6 max-w-3xl mx-auto w-full">
        {/* Header Bar (Desktop only) */}
        <div
          data-page-title
          className="hidden md:flex items-center justify-between gap-3 pb-2 border-b border-border/70 dark:border-border/60 shrink-0"
        >
          <h1 className="text-lg font-bold tracking-tight text-foreground truncate">
            {t("schedule.title")}
          </h1>
        </div>

      {/* Filter Bar: Child Selection (Below Title, Parents only) */}
      {isParent && webtopConfig?.linkedChildren && webtopConfig.linkedChildren.length > 0 && (
        <div className="flex items-center justify-between gap-2 pt-1 pb-2 shrink-0">
          <div
            role="tablist"
            aria-label={t("schedule.select_child")}
            data-schedule-child-selector
            className="inline-flex items-center p-1 h-10 rounded-full apple-liquid-dock overflow-x-auto no-scrollbar max-w-full"
          >
            {webtopConfig.linkedChildren.map((c) => {
              const isActive = selectedChildId === c.id
              const displayName = c.firstName?.trim() || c.lastName?.trim() || ""

              return (
                <motion.button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelectChild(c.id)}
                  className={cn(
                    "relative flex items-center justify-center h-8 px-4 rounded-full text-base font-medium transition-colors select-none shrink-0 focus:outline-none focus-visible:outline-none",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="scheduleChildLiquidPill"
                      transition={{
                        type: "spring",
                        stiffness: 450,
                        damping: 35
                      }}
                      className="absolute inset-0 rounded-full apple-liquid-pill"
                    />
                  )}
                  <span className="relative z-10 truncate max-w-[140px]">
                    {displayName}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : isChild && !currentUser?.linkedChildId ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
          <Card className="w-full max-w-md border-dashed border-2 shadow-sm text-center p-8 bg-card/40">
            <div className="w-12 h-12 rounded-full bg-[#D4973B]/15 text-[#D4973B] dark:bg-[#D4973B]/25 dark:text-[#F5D59E] flex items-center justify-center mx-auto mb-3">
              <CalendarDays className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-base text-foreground">{t("schedule.title")}</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              {t("schedule.child_unlinked_desc")}
            </p>
          </Card>
        </div>
      ) : !selectedChildId ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
          <Card className="w-full max-w-md border-dashed border-2 shadow-sm text-center p-8 bg-card/40">
            <div className="w-12 h-12 rounded-full bg-[#555DB0]/15 text-[#555DB0] dark:bg-[#555DB0]/25 dark:text-[#C5C8F5] flex items-center justify-center mx-auto mb-3">
              <CalendarDays className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-base text-foreground">{t("schedule.title")}</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              {t("schedule.no_children_warning")}
            </p>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col">
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
                  {DAYS.map((day) => {
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
                      {DAYS.map((day) => {
                        const lesson = lessonMap.get(`${day}-${hourNum}`)
                        const isToday = currentDayOfWeek === day

                        const canEdit = isParent && isEditMode

                        return (
                          <div
                            key={day}
                            onClick={() => handleOpenLessonModal(day, hourNum)}
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
                  {DAYS.map((day) => {
                    const finishTime = finishTimeMap.get(day)
                    const isToday = currentDayOfWeek === day
                    const canEdit = isParent && isEditMode

                    return (
                      <div
                        key={day}
                        onClick={() => handleOpenFinishModal(day)}
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
      )}

      {/* Lesson Edit/Add Dialog */}
      <Dialog open={Boolean(editingLesson)} onOpenChange={(open) => !open && setEditingLesson(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLesson?.lesson
                ? t("schedule.lesson_modal_title_edit")
                : t("schedule.lesson_modal_title_add")}
            </DialogTitle>
            <DialogDescription>
              {editingLesson
                ? t("schedule.lesson_modal_desc", {
                    day: t(`schedule.days.day_${editingLesson.dayOfWeek}`),
                    hour: editingLesson.hourNum
                  })
                : ""}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveLesson} className="flex flex-col flex-1 space-y-4 py-2">
            {/* Subject */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="lesson-form-subject">{t("schedule.subject_label")}</Label>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {formSubject.length}/50
                </span>
              </div>
              <Input
                id="lesson-form-subject"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder={t("schedule.subject_placeholder")}
                required
                maxLength={50}
                className="bg-muted dark:bg-secondary border-transparent"
              />
            </div>

            <DialogFooter className="flex items-center justify-between gap-2 pt-2">
              {editingLesson?.lesson && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleClearLesson}
                  className="rounded-full me-auto h-9"
                >
                  <Trash2 className="w-4 h-4 me-1.5" />
                  {t("schedule.clear_lesson")}
                </Button>
              )}
              <div className="flex items-center gap-2 ms-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingLesson(null)}
                  className="rounded-full h-9"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={!formSubject.trim()}
                  className="rounded-full h-9"
                >
                  {t("common.save")}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* School Finish Time Dialog */}
      <Dialog open={editingFinishDay !== null} onOpenChange={(open) => !open && setEditingFinishDay(null)}>
        <DialogContent
          className="sm:max-w-sm"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{t("schedule.finish_time_modal_title")}</DialogTitle>
            <DialogDescription>
              {editingFinishDay !== null
                ? t("schedule.finish_time_modal_desc", {
                    day: t(`schedule.days.day_${editingFinishDay}`)
                  })
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col space-y-4 py-2">
            {/* Time input */}
            <div className="space-y-2">
              <Label htmlFor="finish-time-input">{t("schedule.finish_time_label")}</Label>
              <Input
                id="finish-time-input"
                type="text"
                inputMode="numeric"
                placeholder="13:30"
                maxLength={5}
                value={formFinishTime}
                onChange={handleFinishTimeInputChange}
                className="bg-muted dark:bg-secondary border-transparent font-bold tabular-nums text-start"
              />
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("schedule.finish_time_presets")}
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                {COMMON_FINISH_PRESETS.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={formFinishTime === preset ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormFinishTime(preset)}
                    className="h-8 text-xs font-semibold tabular-nums"
                  >
                    {preset}
                  </Button>
                ))}
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between gap-2 pt-2">
              {finishTimeMap.get(editingFinishDay ?? -1) && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleSaveFinishTime("")}
                  className="rounded-full me-auto h-9"
                >
                  <Trash2 className="w-4 h-4 me-1.5" />
                  {t("schedule.clear_finish_time")}
                </Button>
              )}
              <div className="flex items-center gap-2 ms-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingFinishDay(null)}
                  className="rounded-full h-9"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSaveFinishTime(formFinishTime)}
                  disabled={!/^([01]\d|2[0-3]):[0-5]\d$/.test(formFinishTime.trim())}
                  className="rounded-full h-9"
                >
                  {t("common.save")}
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      </div>

      {/* Floating Edit / Done Action Button (Aligned with cards) */}
      {isParent && selectedChildId && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 max-w-3xl mx-auto w-full px-4 md:px-6">
          <div className="relative h-full w-full">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsEditMode((prev) => !prev)}
              className={cn(
                "pointer-events-auto absolute z-30 h-[50px] w-[50px] rounded-full flex items-center justify-center select-none shadow-md transition-transform focus:outline-none focus-visible:outline-none ltr:end-0 rtl:start-0 md:rtl:start-auto md:end-0 bottom-[calc(max(0.625rem,env(safe-area-inset-bottom)-10px)+5.35rem)] md:bottom-8",
                childColor ? cn(childColor.bg, "text-white") : "bg-primary text-primary-foreground shadow-primary/30"
              )}
              title={isEditMode ? t("schedule.edit_mode_disable") : t("schedule.edit_mode_enable")}
              aria-label={isEditMode ? t("schedule.edit_mode_disable") : t("schedule.edit_mode_enable")}
            >
              {isEditMode ? (
                <Check className="w-[22px] h-[22px] stroke-[2.5px]" />
              ) : (
                <Pencil className="w-[22px] h-[22px] stroke-[2px]" />
              )}
            </motion.button>
          </div>
        </div>
      )}
    </div>
  )
}
