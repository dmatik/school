import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import {
  BookOpen,
  RefreshCw,
  Search,
  User,
  GraduationCap,
  Loader2,
  FileText
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { format, isToday, isYesterday } from "date-fns"
import { he, enUS } from "date-fns/locale"
import { DatePicker } from "@/components/ui/date-picker"
import { cn, parseLocalDate, getHomeworkText, consolidateHomework } from "@/lib/utils"
import { getSubjectConfig } from "@/lib/subject-icons"
import { getChildBadgeClasses } from "@/lib/child-colors"
import { toast } from "@/hooks/use-toast"
import type { HomeworkItem, ConsolidatedHomeworkItem, WebtopConfig } from "@/types"

interface HomeworkPageProps {
  token?: string | null
}

export function HomeworkPage({ token }: HomeworkPageProps) {
  const { t, i18n } = useTranslation()
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
  const [syncing, setSyncing] = useState(false)
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
  }, [loadData])

  const handleSync = async () => {
    if (!token) return
    setSyncing(true)
    try {
      const res = await fetch("/api/webtop/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || t("account.sync_failed"))
      }

      await loadData()
      toast({
        variant: "success",
        title: t("common.confirm"),
        description: t("account.webtop_sync_success", {
          incidents: data.result?.incidentsCount || 0,
          homework: data.result?.homeworkCount || 0
        })
      })
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("account.sync_error")
      })
    } finally {
      setSyncing(false)
    }
  }

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

  return (
    <div className="h-full flex flex-col p-4 md:p-6 overflow-y-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/70 dark:border-border/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-foreground truncate">
            {t("homework.title")}
          </h1>
        </div>

        {/* Sync Button */}
        {webtopConfig?.configured && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 text-xs font-semibold h-8 shrink-0 px-2.5 rounded-lg border-border/80 shadow-xs hover:border-primary/30"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
            <span>{syncing ? t("homework.syncing") : t("homework.sync_now")}</span>
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      {(homework.length > 0 || webtopConfig?.configured) && (
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("homework.search_placeholder")}
              className="ps-9 h-9 text-sm"
            />
          </div>

          {/* Kids Dropdown & Date Filter in the same row */}
          <div className={cn(
            "gap-2 w-full md:flex md:w-auto md:items-center",
            webtopConfig?.linkedChildren && webtopConfig.linkedChildren.length > 0 ? "grid grid-cols-2" : "flex"
          )}>
            {/* Child Selector */}
            {webtopConfig?.linkedChildren && webtopConfig.linkedChildren.length > 0 && (
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger className="h-9 text-sm gap-2 px-3 w-full md:w-[175px] bg-card border-border min-w-0">
                  <div className="flex items-center gap-2 truncate">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <SelectValue placeholder={t("homework.all_students")} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("homework.all_students")}</SelectItem>
                  {webtopConfig.linkedChildren.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Date Filter */}
            <div className="w-full md:w-[175px] min-w-0">
              <DatePicker
                date={selectedDate}
                setDate={setSelectedDate}
                placeholder={t("common.all_dates")}
                disabled={isFutureDate}
                clearable={true}
                formatPattern="dd/MM/yyyy"
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
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
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
                ? t("homework.search_placeholder")
                : t("homework.empty_desc")}
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
        <div className="space-y-6">
          {groupedHomework.map((group) => (
            <div key={group.date} className="space-y-3">
              {/* Day Section Header */}
              <div className="pb-1.5 border-b border-border/70 dark:border-border/60">
                <h2 className="text-sm sm:text-base font-bold text-muted-foreground tracking-tight">
                  {formatOneLineDate(group.date) || group.date}
                </h2>
              </div>

              {/* 2-column compact cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
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
                  const homeworkText = getHomeworkText(hw)

                  return (
                    <Card
                      key={hw.id}
                      className="shadow-xs border border-border/70 dark:border-border/60 hover:border-primary/30 hover:shadow-sm transition-all duration-200 flex flex-col p-3 sm:p-3.5 gap-2.5 rounded-xl"
                    >
                      {/* Top Row: Subject Icon, Subject Title & Teacher, Student Name badge */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          {/* Subject icon badge */}
                          <div
                            className={cn(
                              "w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 shadow-xs",
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

                        {/* Student Name badge */}
                        {hw.studentName && (
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-bold border shrink-0 shadow-xs transition-colors mt-0.5",
                              childBadgeClass
                            )}
                          >
                            <span className="truncate max-w-[130px] sm:max-w-none">{hw.studentName}</span>
                          </span>
                        )}
                      </div>

                      {/* Homework text below: crisp typography in a clean subtle panel */}
                      {homeworkText ? (
                        <div className="text-sm sm:text-base text-start leading-relaxed text-foreground whitespace-pre-line bg-muted/40 dark:bg-secondary/80 p-2.5 rounded-lg border border-border/40 dark:border-border/60 mt-0.5">
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
