import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/ui/page-header"
import { LiquidTabs } from "@/components/ui/liquid-tabs"
import {
  Trash2,
  Loader2,
  CalendarDays,
  Pencil,
  Check,
  Printer
} from "lucide-react"
import { Button, LiquidButton } from "@/components/ui/button"
import { Modal, ConfirmModal } from "@/components/ui/modal"
import { EmptyStateCard } from "@/components/ui/empty-state-card"
import { FilledInput, CounterField, TimePresetInput } from "@/components/ui/form-field"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { getChildColor } from "@/lib/child-colors"
import { ScheduleTable } from "@/components/ui/schedule-table"
import { FloatingActionButton } from "@/components/ui/floating-action-button"
import type { ScheduleLesson, ScheduleFinishTime, WebtopConfig, User as UserType } from "@/types"

interface SchedulePageProps {
  token?: string | null
  syncTrigger?: number
  currentUser?: UserType | null
}

const COMMON_FINISH_PRESETS = ["11:45", "12:45", "13:30", "14:15", "15:00", "16:00"]

export function SchedulePage({ token, syncTrigger, currentUser }: SchedulePageProps) {
  const { t } = useTranslation()
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

  // Confirm clear modal states
  const [confirmClearLesson, setConfirmClearLesson] = useState(false)
  const [confirmClearFinishTime, setConfirmClearFinishTime] = useState(false)

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

  const hasChildFilter = Boolean(
    isParent && webtopConfig?.linkedChildren && webtopConfig.linkedChildren.length > 0
  )

  const handlePrint = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget
    button.blur()
    window.print()
    button.blur()
    requestAnimationFrame(() => button.blur())
  }, [])

  const childTabItems = useMemo(() => (
    webtopConfig?.linkedChildren?.map((c) => ({
      id: c.id,
      label: c.firstName?.trim() || c.lastName?.trim() || ""
    })) || []
  ), [webtopConfig?.linkedChildren])

  return (
    <div className="relative h-full w-full overflow-hidden print:h-full print:overflow-visible">
      <div className="h-full flex flex-col pt-[3.75rem] pb-[calc(max(0.625rem,env(safe-area-inset-bottom)-10px)+10rem)] px-4 md:pt-0 md:pb-28 md:px-6 overflow-y-auto gap-4 md:gap-6 max-w-3xl mx-auto w-full print:h-full print:overflow-visible print:p-0 print:max-w-none print:items-center print:justify-center">
        {/* Header Bar (Desktop only) */}
        <PageHeader title={t("schedule.title")} className="print:hidden" />

      {/* Filter Bar: Child Selection (Parents) & Print Button */}
      {(hasChildFilter || Boolean(selectedChildId)) && (
        <div
          data-sticky-filters
          className="sticky top-0 md:top-[61px] z-20 flex items-center justify-between gap-2 pt-1 pb-2 shrink-0 print:hidden"
        >
          {hasChildFilter && (
            <LiquidTabs
              data-schedule-child-selector
              aria-label={t("schedule.select_child")}
              items={childTabItems}
              selectedId={selectedChildId}
              onSelect={handleSelectChild}
              layoutId="scheduleChildLiquidPill"
            />
          )}
          {selectedChildId && (
            <div className={cn("shrink-0", hasChildFilter && "ms-auto")}>
              <LiquidButton
                data-schedule-print-btn
                icon={Printer}
                onMouseDown={(e) => e.preventDefault()}
                onClick={handlePrint}
                disabled={loading}
                className="hover:text-muted-foreground focus:text-muted-foreground active:text-muted-foreground"
                title={t("schedule.print")}
                aria-label={t("schedule.print")}
              >
                {t("schedule.print")}
              </LiquidButton>
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
          <EmptyStateCard
            icon={CalendarDays}
            iconClassName="bg-[#D4973B]/15 text-[#D4973B] dark:bg-[#D4973B]/25 dark:text-[#F5D59E]"
            title={t("schedule.title")}
            description={t("schedule.child_unlinked_desc")}
          />
        </div>
      ) : !selectedChildId ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
          <EmptyStateCard
            icon={CalendarDays}
            iconClassName="bg-[#555DB0]/15 text-[#555DB0] dark:bg-[#555DB0]/25 dark:text-[#C5C8F5]"
            title={t("schedule.title")}
            description={t("schedule.no_children_warning")}
          />
        </div>
      ) : (
        <ScheduleTable
          lessons={lessons}
          finishTimes={finishTimes}
          childColorId={currentChild?.color}
          currentDayOfWeek={currentDayOfWeek}
          isEditMode={isEditMode}
          canEdit={isParent && isEditMode}
          onLessonClick={handleOpenLessonModal}
          onFinishTimeClick={handleOpenFinishModal}
          scrollContainerRef={scrollContainerRef}
          dayColRefs={dayColRefs}
          className="print:w-[92%] print:h-[88%]"
        />
      )}

      {/* Lesson Edit/Add Dialog */}
      <Modal
        open={Boolean(editingLesson)}
        onOpenChange={(open) => !open && setEditingLesson(null)}
        title={
          editingLesson?.lesson
            ? t("schedule.lesson_modal_title_edit")
            : t("schedule.lesson_modal_title_add")
        }
        description={
          editingLesson
            ? t("schedule.lesson_modal_desc", {
                day: t(`schedule.days.day_${editingLesson.dayOfWeek}`),
                hour: editingLesson.hourNum
              })
            : ""
        }
        onSubmit={handleSaveLesson}
        footer={
          <div className="flex items-center justify-between gap-2 w-full">
            {editingLesson?.lesson ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmClearLesson(true)}
                className="rounded-full me-auto h-9"
              >
                <Trash2 className="w-4 h-4 me-1.5" />
                {t("schedule.clear_lesson")}
              </Button>
            ) : <div />}
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
          </div>
        }
      >
        <CounterField label={t("schedule.subject_label")} htmlFor="lesson-form-subject" currentLength={formSubject.length} maxLength={50}>
          <FilledInput
            id="lesson-form-subject"
            value={formSubject}
            onChange={(e) => setFormSubject(e.target.value)}
            placeholder={t("schedule.subject_placeholder")}
            required
            maxLength={50}
          />
        </CounterField>
      </Modal>

      {/* Clear Lesson Confirmation Dialog */}
      <ConfirmModal
        open={confirmClearLesson}
        onOpenChange={setConfirmClearLesson}
        icon={Trash2}
        title={t("schedule.clear_lesson")}
        description={t("schedule.clear_lesson_confirm")}
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        onConfirm={async () => {
          setConfirmClearLesson(false)
          await handleClearLesson()
        }}
      />

      {/* School Finish Time Dialog */}
      <Modal
        open={editingFinishDay !== null}
        onOpenChange={(open) => !open && setEditingFinishDay(null)}
        maxWidth="sm"
        onOpenAutoFocus={(e) => e.preventDefault()}
        title={t("schedule.finish_time_modal_title")}
        description={
          editingFinishDay !== null
            ? t("schedule.finish_time_modal_desc", {
                day: t(`schedule.days.day_${editingFinishDay}`)
              })
            : ""
        }
        footer={
          <div className="flex items-center justify-between gap-2 w-full">
            {finishTimeMap.get(editingFinishDay ?? -1) ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmClearFinishTime(true)}
                className="rounded-full me-auto h-9"
              >
                <Trash2 className="w-4 h-4 me-1.5" />
                {t("schedule.clear_finish_time")}
              </Button>
            ) : <div />}
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
          </div>
        }
      >
        <TimePresetInput
          id="finish-time-input"
          value={formFinishTime}
          onChange={setFormFinishTime}
          label={t("schedule.finish_time_label")}
          presetsLabel={t("schedule.finish_time_presets")}
          presets={COMMON_FINISH_PRESETS}
        />
      </Modal>

      {/* Clear Finish Time Confirmation Dialog */}
      <ConfirmModal
        open={confirmClearFinishTime}
        onOpenChange={setConfirmClearFinishTime}
        icon={Trash2}
        title={t("schedule.clear_finish_time")}
        description={t("schedule.clear_finish_time_confirm")}
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        onConfirm={async () => {
          setConfirmClearFinishTime(false)
          await handleSaveFinishTime("")
        }}
      />

      </div>

      {/* Floating Edit / Done Action Button (Aligned with cards) */}
      {isParent && selectedChildId && (
        <FloatingActionButton
          onClick={() => setIsEditMode((prev) => !prev)}
          icon={Pencil}
          activeIcon={Check}
          active={isEditMode}
          colorClassName={childColor ? cn(childColor.bg, "text-white") : undefined}
          title={isEditMode ? t("schedule.edit_mode_disable") : t("schedule.edit_mode_enable")}
          ariaLabel={isEditMode ? t("schedule.edit_mode_disable") : t("schedule.edit_mode_enable")}
          className="print:hidden"
        />
      )}
    </div>
  )
}
