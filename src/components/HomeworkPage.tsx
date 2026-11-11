import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/ui/page-header"
import { LiquidTabs } from "@/components/ui/liquid-tabs"
import { SearchInput } from "@/components/ui/search-input"
import {
  BookOpen,
  GraduationCap,
  Loader2,
  FileText
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format, isToday, isYesterday } from "date-fns"
import { he, enUS } from "date-fns/locale"
import { LiquidDatePicker } from "@/components/ui/liquid-date-picker"
import { cn, parseLocalDate, getHomeworkText, consolidateHomework, getChildFirstName } from "@/lib/utils"
import { getSubjectConfig } from "@/lib/subject-icons"
import { getChildBadgeClasses, getChildAccentColor } from "@/lib/child-colors"
import { toast } from "@/hooks/use-toast"
import type { HomeworkItem, ConsolidatedHomeworkItem, WebtopConfig, User as UserType } from "@/types"

interface HomeworkPageProps {
  token?: string | null
  syncTrigger?: number
  currentUser?: UserType | null
}

export function HomeworkPage({ token, syncTrigger, currentUser }: HomeworkPageProps) {
  const { t, i18n } = useTranslation()
  const isChild = currentUser?.familyRole === "child"
  const isRtl = i18n.dir() === "rtl"
  const dateLocale = isRtl ? he : enUS

  const formatOneLineDate = useCallback((dateInput?: string | Date | null) => {
    if (!dateInput || dateInput === "no-date") return ""
    try {
      const d = parseLocalDate(dateInput)
      if (isNaN(d.getTime())) return ""
      if (isToday(d)) {
        return t("common.today")
      }
      if (isYesterday(d)) {
        return t("common.yesterday")
      }
      return format(d, "EEEE, PPP", { locale: dateLocale })
    } catch {
      return ""
    }
  }, [dateLocale, t])

  const [homework, setHomework] = useState<HomeworkItem[]>([])
  const [webtopConfig, setWebtopConfig] = useState<WebtopConfig | null>(null)
  const webtopConfigRef = useRef<WebtopConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedChildId, setSelectedChildId] = useState<string>("all")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState("")

  const loadData = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const [configRes, hwRes] = await Promise.all([
        fetch("/api/webtop/config", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/homework?childId=${encodeURIComponent(selectedChildId)}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      if (configRes.ok) {
        const configData: WebtopConfig = await configRes.json()
        const prevConfig = webtopConfigRef.current
        webtopConfigRef.current = configData
        setWebtopConfig(configData)

        // If a specific child was selected and Webtop rotated child IDs across days/sessions,
        // remap selectedChildId to the child's new ID based on matching externalId or name
        if (selectedChildId !== "all" && configData.linkedChildren?.length) {
          const stillExists = configData.linkedChildren.some(c => c.id === selectedChildId)
          if (!stillExists) {
            const matchedByExt = configData.linkedChildren.find(c => c.externalId && c.externalId === selectedChildId)
            if (matchedByExt) {
              setSelectedChildId(matchedByExt.id)
            } else {
              const prevChild = prevConfig?.linkedChildren?.find(c => c.id === selectedChildId || (c.externalId && c.externalId === selectedChildId))
              const prevName = prevChild ? `${prevChild.firstName} ${prevChild.lastName}`.trim() : ""
              const matchedNew = prevName
                ? configData.linkedChildren.find(c => `${c.firstName} ${c.lastName}`.trim() === prevName)
                : undefined
              if (matchedNew) {
                setSelectedChildId(matchedNew.id)
              } else {
                setSelectedChildId("all")
              }
            }
          }
        }
      }

      if (hwRes.ok) {
        const hwData = await hwRes.json()
        setHomework(hwData.homework || [])
      }
    } catch (err) {
      console.error("Failed to load homework data:", err)
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("common.error_loading")
      })
    } finally {
      setLoading(false)
    }
  }, [token, selectedChildId, t])

  useEffect(() => {
    loadData()
  }, [loadData, syncTrigger])

  useEffect(() => {
    const handleWebtopSync = () => {
      loadData()
    }
    window.addEventListener("webtop:synced", handleWebtopSync)
    return () => {
      window.removeEventListener("webtop:synced", handleWebtopSync)
    }
  }, [loadData])

  // Filtered homework: display only cards where we actually have homework
  const filteredHomework = useMemo(() => {
    const list = homework.filter(hw => {
      // Must actually have homework
      const hwText = getHomeworkText(hw)
      if (!hwText) {
        return false
      }

      // Date filter
      if (selectedDate) {
        const formattedFilter = format(selectedDate, "yyyy-MM-dd")
        if (hw.dueDate !== formattedFilter) {
          return false
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const match =
          (hw.subject && hw.subject.toLowerCase().includes(q)) ||
          (hw.teacher && hw.teacher.toLowerCase().includes(q)) ||
          (hw.studentName && hw.studentName.toLowerCase().includes(q)) ||
          hwText.toLowerCase().includes(q)

        if (!match) return false
      }

      return true
    })

    // Consolidate cards: same student, same day, same subject and exactly same homework text
    // merge into a single card mentioning all lesson numbers
    return consolidateHomework(list)
  }, [homework, selectedDate, searchQuery])

  // Group filtered homework by date
  const groupedHomework = useMemo(() => {
    const groups: { date: string; items: ConsolidatedHomeworkItem[] }[] = []
    const map = new Map<string, ConsolidatedHomeworkItem[]>()

    for (const hw of filteredHomework) {
      const key = hw.dueDate || "no-date"
      let list = map.get(key)
      if (!list) {
        list = []
        map.set(key, list)
        groups.push({ date: key, items: list })
      }
      list.push(hw)
    }

    return groups
  }, [filteredHomework])

  const hasChildFilter = !isChild && Boolean(webtopConfig?.linkedChildren && webtopConfig.linkedChildren.length > 0)

  const childTabItems = useMemo(() => [
    { id: "all", label: t("homework.all_short") },
    ...(webtopConfig?.linkedChildren.map((c) => ({
      id: c.id,
      label: c.firstName?.trim() || c.lastName?.trim() || ""
    })) || [])
  ], [webtopConfig?.linkedChildren, t])

  return (
    <div className="h-full flex flex-col pt-[3.75rem] pb-24 px-4 md:pt-0 md:pb-6 md:px-6 overflow-y-auto gap-4 md:gap-6 max-w-3xl mx-auto w-full">
      {/* Page Header (Desktop only) */}
      <PageHeader title={t("homework.title")} />

      {/* Search & Filters */}
      {(homework.length > 0 || webtopConfig?.configured) && (
        <>
          {/* Search Input */}
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t("homework.search_placeholder")}
            wrapperClassName="-mb-1.5 md:-mb-3.5"
          />

          {/* Liquid Glass Filter Row: Child selector at beginning of row, Date Picker at end of row (or start if no child filter) */}
          <div
            data-sticky-filters
            className={cn(
              "sticky top-0 md:top-[61px] z-20 flex items-center gap-2 pt-0.5 pb-0.5 shrink-0",
              hasChildFilter ? "justify-between" : "justify-start"
            )}
          >
            {/* 1 - Children Liquid Glass Selector (Parents only) */}
            {hasChildFilter && (
              <LiquidTabs
                data-homework-child-selector
                aria-label={t("homework.filter_child")}
                items={childTabItems}
                selectedId={selectedChildId}
                onSelect={setSelectedChildId}
                layoutId="homeworkChildLiquidPill"
              />
            )}

            {/* Date Filter Button */}
            <div className={cn("shrink-0", hasChildFilter && "ms-auto")}>
              <LiquidDatePicker
                date={selectedDate}
                setDate={setSelectedDate}
                isChild={isChild}
                align={hasChildFilter ? "end" : "start"}
              />
            </div>
          </div>
        </>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !webtopConfig?.configured ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
          <Card className="w-full max-w-xl border-dashed border-2 shadow-sm bg-card/60">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-[#555DB0]/15 text-[#555DB0] dark:bg-[#555DB0]/25 dark:text-[#C5C8F5] flex items-center justify-center mb-3 shadow-inner">
                <GraduationCap className="w-7 h-7" />
              </div>
              <CardTitle className="text-xl font-bold">
                {t("homework.empty_title")}
              </CardTitle>
              <CardDescription className="text-sm max-w-md mx-auto pt-1">
                {t("homework.empty_desc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="rounded-xl bg-muted/60 p-4 border border-border flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary mt-0.5 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="space-y-1 text-start">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-foreground">
                      {t("homework.status_title")}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#555DB0]/15 text-[#555DB0] dark:bg-[#555DB0]/25 dark:text-[#C5C8F5] border border-transparent">
                      {t("homework.integration_badge")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t("homework.status_desc")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : filteredHomework.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
          <Card className="w-full max-w-md border-dashed border-2 shadow-sm text-center p-8 bg-card/40">
            <div className="w-12 h-12 rounded-full bg-[#555DB0]/15 text-[#555DB0] dark:bg-[#555DB0]/25 dark:text-[#C5C8F5] flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-base text-foreground">
              {selectedDate && !searchQuery
                ? t("homework.no_homework_for_date")
                : searchQuery || selectedDate
                  ? t("homework.no_homework_match")
                  : t("homework.empty_title")}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              {searchQuery || selectedDate
                ? null
                : (isChild && !currentUser?.linkedChildId
                    ? t("homework.child_unlinked_desc")
                    : t("homework.empty_desc"))}
            </p>
            {selectedDate && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date())}
                  className="text-xs h-8"
                >
                  {t("homework.back_to_today")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate(undefined)}
                  className="text-xs h-8"
                >
                  {t("common.all_dates")}
                </Button>
              </div>
            )}
          </Card>
        </div>
      ) : (
        <div className="space-y-3.5 !mt-0">
          {groupedHomework.map((group) => (
            <div key={group.date} className="space-y-1">
              {/* Date Section Header: No badge, aligned to beginning of the row */}
              <div className="flex justify-start pt-1 pb-1 px-1">
                <h2 className="text-sm sm:text-base font-semibold text-muted-foreground tracking-tight select-none text-start">
                  {formatOneLineDate(group.date) || group.date}
                </h2>
              </div>

              {/* Chat-style Continuing Feed */}
              <div className="flex flex-col gap-2.5 sm:gap-3">
                {group.items.map((hw) => {
                  const subjectConfig = getSubjectConfig(hw.subject)
                  const SubjectIcon = subjectConfig.icon
                  const subjectBadgeClass = subjectConfig.solidBadgeClass
                  const matchedChild = webtopConfig?.linkedChildren?.find(
                    (c) =>
                      (hw.childId && c.id === hw.childId) ||
                      (hw.studentId && (c.id === hw.studentId || (c.externalId && c.externalId === hw.studentId))) ||
                      (hw.studentName && `${c.firstName} ${c.lastName}`.trim() === hw.studentName.trim())
                  )
                  const childBadgeClass = getChildBadgeClasses(matchedChild?.color)
                  const childAccentClass = getChildAccentColor(matchedChild?.color)
                  const childDisplayName = getChildFirstName(hw.studentName, matchedChild) || hw.studentName
                  const homeworkText = getHomeworkText(hw)

                  return (
                    <Card
                      key={hw.id}
                      className="relative overflow-hidden shadow-xs border border-border/40 dark:border-border/60 hover:shadow-sm transition-all duration-200 flex flex-col p-3.5 sm:p-4 gap-2.5 rounded-2xl bg-card"
                    >
                      {/* Top Row: Subject Icon + Title & Lesson (Start), Child Name badge (End) */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Subject icon badge: rounded-corner square */}
                          <div
                            className={cn(
                              "w-11 h-11 rounded-[14px] border flex items-center justify-center shrink-0",
                              subjectBadgeClass
                            )}
                          >
                            <SubjectIcon className="w-5 h-5 shrink-0 stroke-[2.25]" />
                          </div>

                          {/* Subject Title & Lesson number stacked */}
                          <div className="min-w-0 flex-1 flex flex-col justify-center">
                            <span className="font-bold text-base sm:text-lg text-foreground truncate tracking-tight text-start">
                              {hw.subject}
                            </span>
                            {hw.hourNums && hw.hourNums.length > 1 ? (
                              <span className="font-normal text-xs sm:text-sm text-muted-foreground truncate text-start">
                                {t("homework.lesson_hours", { hours: hw.hourNums.join(", ") })}
                              </span>
                            ) : (hw.hourNums && hw.hourNums.length === 1) || hw.hourNum ? (
                              <span className="font-normal text-xs sm:text-sm text-muted-foreground truncate text-start">
                                {t("homework.lesson_hour", { hour: (hw.hourNums && hw.hourNums[0]) ?? hw.hourNum })}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Student Name badge with child color and dot indicator (hidden for child users) */}
                        {!isChild && childDisplayName && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-transparent shrink-0 shadow-xs transition-colors mt-0.5",
                              childBadgeClass
                            )}
                          >
                            <span className={cn("w-2 h-2 rounded-full shrink-0", childAccentClass)} />
                            <span className="truncate max-w-[120px] sm:max-w-none">{childDisplayName}</span>
                          </span>
                        )}
                      </div>

                      {/* Teacher name */}
                      {hw.teacher && (
                        <div className="text-sm text-muted-foreground font-medium text-start truncate">
                          {hw.teacher}
                        </div>
                      )}

                      {/* Homework text area: no box, separated by hairline divider */}
                      {homeworkText ? (
                        <div className="text-base font-normal text-start leading-relaxed text-foreground whitespace-pre-line pt-2.5 border-t border-border/60 dark:border-border/50">
                          <span className="me-1.5">
                            {t("homework.homework_prefix")}
                          </span>
                          <span className="font-normal">
                            {homeworkText}
                          </span>
                        </div>
                      ) : null}
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default HomeworkPage
