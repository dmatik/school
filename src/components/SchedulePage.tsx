import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import {
  User,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Check,
  X
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
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
  const [isEditMode, setIsEditMode] = useState(false)
  const [hasPendingChanges, setHasPendingChanges] = useState(false)
  const [isSavingBatch, setIsSavingBatch] = useState(false)
  const snapshotRef = useRef<{ lessons: ScheduleLesson[]; finishTimes: ScheduleFinishTime[] } | null>(null)

  // Mobile horizontal scroll ref and column refs
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const dayColRefs = useRef<(HTMLDivElement | null)[]>([])
  const initialScrollDone = useRef(false)

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
      }
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
    if (selectedChildId) {
      loadSchedule(selectedChildId)
    } else {
      setLoading(false)
    }
  }, [selectedChildId, loadSchedule, syncTrigger])

  // Scroll mobile container to the initial target day
  useEffect(() => {
    if (loading || initialScrollDone.current) return
    if (initialTargetDay === 0) {
      initialScrollDone.current = true
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ left: 0 })
      }
      return
    }
    const targetEl = dayColRefs.current[initialTargetDay]
    if (targetEl && scrollContainerRef.current) {
      // Use requestAnimationFrame to ensure layout has rendered
      requestAnimationFrame(() => {
        targetEl.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })
        initialScrollDone.current = true
      })
    }
  }, [loading, initialTargetDay])

  // Determine hours range: always display 1 hour below the highest populated lesson in any day (min 1, max 12)
  const hoursToDisplay = useMemo(() => {
    let maxPopulatedHour = 0
    for (const l of lessons) {
      if (l.subject && l.subject.trim() && l.hourNum > maxPopulatedHour) {
        maxPopulatedHour = l.hourNum
      }
    }
    const maxHour = Math.min(Math.max(maxPopulatedHour + 1, 1), 12)
    const list: number[] = []
    for (let h = 1; h <= maxHour; h++) {
      list.push(h)
    }
    return list
  }, [lessons])

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

  // Start Edit Mode
  const handleStartEditMode = () => {
    if (!isParent) return
    snapshotRef.current = {
      lessons: [...lessons],
      finishTimes: [...finishTimes]
    }
    setHasPendingChanges(false)
    setIsEditMode(true)
  }

  // Save changes and close Edit Mode
  const handleSaveAndCloseEditMode = async () => {
    if (!isParent) return
    if (!hasPendingChanges) {
      setIsEditMode(false)
      snapshotRef.current = null
      return
    }

    if (!token || !selectedChildId) {
      setIsEditMode(false)
      setHasPendingChanges(false)
      snapshotRef.current = null
      return
    }

    setIsSavingBatch(true)
    try {
      const res = await fetch("/api/schedule/batch", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          childId: selectedChildId,
          lessons,
          finishTimes
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || data.error || t("schedule.save_failed"))
      }

      if (data.lessons) setLessons(data.lessons)
      if (data.finishTimes) setFinishTimes(data.finishTimes)

      setIsEditMode(false)
      setHasPendingChanges(false)
      snapshotRef.current = null
    } catch (err: unknown) {
      console.error("Failed to save schedule batch:", err)
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("schedule.save_failed")
      })
    } finally {
      setIsSavingBatch(false)
    }
  }

  // Cancel anything edited and close Edit Mode
  const handleCancelEditMode = () => {
    if (snapshotRef.current) {
      setLessons(snapshotRef.current.lessons)
      setFinishTimes(snapshotRef.current.finishTimes)
    }
    setIsEditMode(false)
    setHasPendingChanges(false)
    snapshotRef.current = null
  }

  // Child selection change handler: cancel edit mode if active
  const handleSelectChild = (childId: string) => {
    if (isEditMode) {
      handleCancelEditMode()
    }
    setSelectedChildId(childId)
  }

  // Save Lesson in local state
  const handleSaveLesson = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLesson) return
    const cleanSubject = formSubject.trim().slice(0, 50)
    setLessons((prev) => {
      const filtered = prev.filter(
        (l) => !(l.dayOfWeek === editingLesson.dayOfWeek && l.hourNum === editingLesson.hourNum)
      )
      if (cleanSubject) {
        return [
          ...filtered,
          {
            id: editingLesson.lesson?.id || `temp-${Date.now()}`,
            childId: selectedChildId,
            dayOfWeek: editingLesson.dayOfWeek,
            hourNum: editingLesson.hourNum,
            subject: cleanSubject
          }
        ]
      }
      return filtered
    })
    setHasPendingChanges(true)
    setEditingLesson(null)
  }

  // Clear Lesson in local state
  const handleClearLesson = () => {
    if (!editingLesson) return
    setLessons((prev) =>
      prev.filter(
        (l) => !(l.dayOfWeek === editingLesson.dayOfWeek && l.hourNum === editingLesson.hourNum)
      )
    )
    setHasPendingChanges(true)
    setEditingLesson(null)
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

  // Save Finish Time in local state
  const handleSaveFinishTime = (timeValue: string) => {
    if (editingFinishDay === null) return
    const cleanTime = timeValue.trim()
    setFinishTimes((prev) => {
      const filtered = prev.filter((f) => f.dayOfWeek !== editingFinishDay)
      if (cleanTime) {
        return [
          ...filtered,
          {
            id: `temp-finish-${Date.now()}`,
            childId: selectedChildId,
            dayOfWeek: editingFinishDay,
            finishTime: cleanTime
          }
        ]
      }
      return filtered
    })
    setHasPendingChanges(true)
    setEditingFinishDay(null)
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
    <div className="h-full flex flex-col pt-16 pb-28 px-2 sm:px-4 md:pt-6 md:pb-16 md:px-6 overflow-y-auto max-w-3xl mx-auto w-full">
      {/* Header Bar */}
      <div
        data-page-title
        className="flex items-center justify-between gap-3 pb-3 border-b border-border/70 dark:border-border/60 shrink-0"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CalendarDays className="w-4 h-4 stroke-[2.2px]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-foreground truncate">
              {t("schedule.title")}
            </h1>
          </div>
        </div>
      </div>

      {/* Filter / Actions Bar: Child Selection & Edit Mode (Below Title, Parents only) */}
      {isParent && (
        <div className="flex items-center gap-2 pt-3 pb-1 shrink-0">
          {webtopConfig?.linkedChildren && webtopConfig.linkedChildren.length > 0 && (
            <Select value={selectedChildId} onValueChange={handleSelectChild} disabled={isSavingBatch}>
              <SelectTrigger
                disabled={isSavingBatch}
                className="h-9 text-sm gap-2 px-3.5 w-auto min-w-[150px] sm:w-[180px] bg-card border-transparent shadow-xs rounded-full hover:bg-card/90 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <SelectValue placeholder={t("schedule.select_child")} />
                </div>
              </SelectTrigger>
              <SelectContent>
                {webtopConfig.linkedChildren.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Edit Mode Buttons */}
          {!isEditMode ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleStartEditMode}
              className="h-9 w-9 rounded-full border border-transparent shadow-xs transition-all shrink-0 bg-card text-muted-foreground hover:text-foreground hover:bg-card/90"
              title={t("schedule.edit_mode_enable")}
              aria-label={t("schedule.edit_mode_enable")}
            >
              <Pencil className="w-4 h-4 stroke-[2px]" />
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Checkmark Button: Save / Done */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleSaveAndCloseEditMode}
                disabled={isSavingBatch}
                className="h-9 w-9 rounded-full border border-transparent shadow-xs transition-all shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                title={t("schedule.edit_mode_save")}
                aria-label={t("schedule.edit_mode_save")}
              >
                {isSavingBatch ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[2.5px]" />
                )}
              </Button>

              {/* X Button: Cancel anything edited and close edit mode */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleCancelEditMode}
                disabled={isSavingBatch}
                className="h-9 w-9 rounded-full border border-transparent shadow-xs transition-all shrink-0 bg-card text-muted-foreground hover:text-destructive hover:bg-card/90"
                title={t("schedule.edit_mode_cancel")}
                aria-label={t("schedule.edit_mode_cancel")}
              >
                <X className="w-4 h-4 stroke-[2.2px]" />
              </Button>
            </div>
          )}
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
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
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
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <CalendarDays className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-base text-foreground">{t("schedule.title")}</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              {t("schedule.no_children_warning")}
            </p>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col pt-2">
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
                  childColor ? cn(childColor.badgeBg, childColor.badgeText) : "bg-muted/80 dark:bg-secondary/80 text-muted-foreground"
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
                    "h-10 backdrop-blur-md border-b border-border/80 flex shrink-0 divide-x rtl:divide-x-reverse divide-border/70 transition-colors",
                    childColor ? childColor.badgeBg : "bg-muted/80 dark:bg-secondary/80"
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
                          isToday && (childColor ? "bg-black/5 dark:bg-white/10" : "bg-primary/5 text-primary")
                        )}
                      >
                        <div className="flex items-center gap-1 min-w-0 max-w-full">
                          <span className={cn("font-bold text-xs sm:text-sm truncate", childColor ? childColor.badgeText : "")}>
                            {t(`schedule.days.day_${day}`)}
                          </span>
                          {isToday && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary text-primary-foreground leading-tight shrink-0">
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
                autoFocus
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
  )
}
