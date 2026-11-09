import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { motion } from "framer-motion"
import {
  BookOpen,
  Search,
  GraduationCap,
  Loader2,
  FileText,
  X
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { format, isToday, isYesterday } from "date-fns"
import { he, enUS } from "date-fns/locale"
import { DatePicker } from "@/components/ui/date-picker"
import { cn, parseLocalDate, getHomeworkText, consolidateHomework, getChildFirstName } from "@/lib/utils"
import { getSubjectConfig } from "@/lib/subject-icons"
import { getChildBadgeClasses } from "@/lib/child-colors"
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

  const formatDateFilterDisplay = useCallback((d: Date) => {
    const short = format(d, "dd/MM/yyyy")
    const full = formatOneLineDate(d) || short
    if (isChild) {
      return { short: full, full }
    }
    return { short, full }
  }, [formatOneLineDate, isChild])

  const [homework, setHomework] = useState<HomeworkItem[]>([])
  const [webtopConfig, setWebtopConfig] = useState<WebtopConfig | null>(null)
  const webtopConfigRef = useRef<WebtopConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedChildId, setSelectedChildId] = useState<string>("all")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState("")

  const isFutureDate = (d: Date) => {
    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)
    return d > endOfToday
  }

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

  return (
    <div className="h-full flex flex-col pt-[3.75rem] pb-24 px-4 md:pt-6 md:pb-6 md:px-6 overflow-y-auto gap-4 md:gap-6 max-w-3xl mx-auto w-full">
      {/* Page Header (Desktop only) */}
      <div data-page-title className="hidden md:flex items-center justify-between gap-3 pb-2 border-b border-border/70 dark:border-border/60">
        <h1 className="text-lg font-bold tracking-tight text-foreground truncate">
          {t("homework.title")}
        </h1>
      </div>

      {/* Search & Filters */}
      {(homework.length > 0 || webtopConfig?.configured) && (
        <div className="flex flex-col gap-2.5 shrink-0">
          {/* Search Input */}
          <div className="relative w-full">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("homework.search_placeholder")}
              className="ps-11 pe-11 h-11 text-[18px] rounded-full bg-black/[0.05] dark:bg-white/[0.08] border border-transparent shadow-none placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-transparent focus-visible:border-transparent"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute end-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 flex items-center justify-center"
                aria-label={t("common.clear_search")}
              >
                <X className="w-4 h-4 stroke-[2.5px]" />
              </button>
            )}
          </div>

          {/* Liquid Glass Filter Row: Child selector at beginning of row, Date Picker at end of row (or start if no child filter) */}
          <div className={cn("flex items-center gap-2 pt-1 pb-2 shrink-0", hasChildFilter ? "justify-between" : "justify-start")}>
            {/* 1 - Children Liquid Glass Selector (Parents only) */}
            {hasChildFilter && (
              <div
                role="tablist"
                aria-label={t("homework.filter_child")}
                data-homework-child-selector
                className="inline-flex items-center p-1 h-10 rounded-full apple-liquid-dock overflow-x-auto no-scrollbar max-w-full shrink-0"
              >
                {/* All option */}
                <motion.button
                  type="button"
                  role="tab"
                  aria-selected={selectedChildId === "all"}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedChildId("all")}
                  className={cn(
                    "relative flex items-center justify-center h-8 px-4 rounded-full text-base font-medium transition-colors select-none shrink-0 focus:outline-none focus-visible:outline-none",
                    selectedChildId === "all"
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {selectedChildId === "all" && (
                    <motion.div
                      layoutId="homeworkChildLiquidPill"
                      transition={{
                        type: "spring",
                        stiffness: 450,
                        damping: 35
                      }}
                      className="absolute inset-0 rounded-full apple-liquid-pill"
                    />
                  )}
                  <span className="relative z-10 truncate">
                    {t("homework.all_short")}
                  </span>
                </motion.button>

                {/* Children options */}
                {webtopConfig?.linkedChildren.map((c) => {
                  const isActive = selectedChildId === c.id
                  const displayName = c.firstName?.trim() || c.lastName?.trim() || ""

                  return (
                    <motion.button
                      key={c.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedChildId(c.id)}
                      className={cn(
                        "relative flex items-center justify-center h-8 px-4 rounded-full text-base font-medium transition-colors select-none shrink-0 focus:outline-none focus-visible:outline-none",
                        isActive
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="homeworkChildLiquidPill"
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
            )}

            {/* Date Filter Button */}
            <div className={cn("shrink-0", hasChildFilter && "ms-auto")}>
              <DatePicker
                variant="liquid"
                date={selectedDate}
                setDate={setSelectedDate}
                placeholder={t("common.all_dates")}
                disabled={isFutureDate}
                clearable={true}
                formatDisplay={formatDateFilterDisplay}
                align={hasChildFilter ? "end" : "start"}
              />
            </div>
          </div>
        </div>
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
              <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 shadow-inner">
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
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-transparent">
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
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
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
        <div className="space-y-4 !mt-4">
          {groupedHomework.map((group) => (
            <div key={group.date} className="space-y-1">
              {/* Floating Chat Date Pill */}
              <div className="flex justify-center sticky top-0 z-10 pt-0.5 pb-0.5 pointer-events-none">
                <h2 className="pointer-events-auto px-3.5 py-1 rounded-full text-xs font-semibold text-muted-foreground tracking-tight bg-card/85 dark:bg-card/80 border border-transparent shadow-xs backdrop-blur-md select-none">
                  {formatOneLineDate(group.date) || group.date}
                </h2>
              </div>

              {/* Chat-style Continuing Feed */}
              <div className="flex flex-col gap-2.5 sm:gap-3">
                {group.items.map((hw) => {
                  const subjectConfig = getSubjectConfig(hw.subject)
                  const SubjectIcon = subjectConfig.icon
                  const subjectBadgeClass = subjectConfig.badgeClass
                  const matchedChild = webtopConfig?.linkedChildren?.find(
                    (c) =>
                      (hw.childId && c.id === hw.childId) ||
                      (hw.studentId && (c.id === hw.studentId || (c.externalId && c.externalId === hw.studentId))) ||
                      (hw.studentName && `${c.firstName} ${c.lastName}`.trim() === hw.studentName.trim())
                  )
                  const childBadgeClass = getChildBadgeClasses(matchedChild?.color)
                  const childDisplayName = getChildFirstName(hw.studentName, matchedChild) || hw.studentName
                  const homeworkText = getHomeworkText(hw)

                  return (
                    <Card
                      key={hw.id}
                      className="shadow-xs border border-transparent hover:shadow-sm transition-all duration-200 flex flex-col p-3 sm:p-3.5 gap-2.5 rounded-xl sm:rounded-2xl bg-card"
                    >
                      {/* Top Row: Subject Icon, Subject Title & Teacher, Student Name badge */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          {/* Subject icon badge */}
                          <div
                            className={cn(
                              "w-11 h-11 rounded-full border flex items-center justify-center shrink-0 shadow-xs",
                              subjectBadgeClass
                            )}
                          >
                            <SubjectIcon className="w-5 h-5 shrink-0" />
                          </div>

                          {/* Subject Title & Teacher name */}
                          <div className="min-w-0 flex-1 flex flex-col justify-center min-h-[44px]">
                            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                              <span className="font-bold text-base sm:text-lg text-foreground truncate tracking-tight">{hw.subject}</span>
                              {hw.hourNums && hw.hourNums.length > 1 ? (
                                <span className="font-normal text-sm text-muted-foreground shrink-0">
                                  ({t("homework.lesson_hours", { hours: hw.hourNums.join(", ") })})
                                </span>
                              ) : (hw.hourNums && hw.hourNums.length === 1) || hw.hourNum ? (
                                <span className="font-normal text-sm text-muted-foreground shrink-0">
                                  ({t("homework.lesson_hour", { hour: (hw.hourNums && hw.hourNums[0]) ?? hw.hourNum })})
                                </span>
                              ) : null}
                            </div>

                            {/* Teacher name */}
                            {hw.teacher && (
                              <div className="text-sm text-muted-foreground font-medium truncate mt-0.5">
                                {hw.teacher}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Student Name badge (hidden for child users) */}
                        {!isChild && childDisplayName && (
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border border-transparent shrink-0 shadow-xs transition-colors mt-0.5",
                              childBadgeClass
                            )}
                          >
                            <span className="truncate max-w-[130px] sm:max-w-none">{childDisplayName}</span>
                          </span>
                        )}
                      </div>

                      {/* Homework text below: crisp typography in a clean subtle panel */}
                      {homeworkText ? (
                        <div className="text-sm sm:text-base text-start leading-relaxed text-foreground whitespace-pre-line bg-muted/40 dark:bg-secondary/80 p-2.5 rounded-lg border border-transparent mt-0.5">
                          <span className="font-bold me-1.5 text-foreground">
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
