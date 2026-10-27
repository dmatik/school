import { useState, useEffect, useMemo, useCallback } from "react"
import { useTranslation } from "react-i18next"
import {
  BookOpen,
  RefreshCw,
  Search,
  Filter,
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
import { format } from "date-fns"
import { DatePicker } from "@/components/ui/date-picker"
import { DateBadge } from "@/components/ui/date-badge"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import type { HomeworkItem, WebtopConfig } from "@/types"

interface HomeworkPageProps {
  token?: string | null
}

export function HomeworkPage({ token }: HomeworkPageProps) {
  const { t } = useTranslation()
  const [homework, setHomework] = useState<HomeworkItem[]>([])
  const [webtopConfig, setWebtopConfig] = useState<WebtopConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [selectedChildId, setSelectedChildId] = useState<string>("all")
  const [selectedSubject, setSelectedSubject] = useState<string>("all")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => new Date())
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
        setWebtopConfig(configData)
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
        throw new Error(data.error || "Sync failed")
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
        description: err instanceof Error ? err.message : "Sync error"
      })
    } finally {
      setSyncing(false)
    }
  }

  // Unique subjects list for filtering
  const subjects = useMemo(() => {
    const set = new Set<string>()
    for (const hw of homework) {
      if (hw.subject) set.add(hw.subject)
    }
    return Array.from(set)
  }, [homework])

  // Filtered homework
  const filteredHomework = useMemo(() => {
    return homework.filter(hw => {
      // Date filter
      if (selectedDate) {
        const formattedFilter = format(selectedDate, "yyyy-MM-dd")
        if (hw.dueDate !== formattedFilter) {
          return false
        }
      }

      // Subject filter
      if (selectedSubject !== "all" && hw.subject !== selectedSubject) {
        return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const match =
          (hw.subject && hw.subject.toLowerCase().includes(q)) ||
          (hw.teacher && hw.teacher.toLowerCase().includes(q)) ||
          (hw.studentName && hw.studentName.toLowerCase().includes(q)) ||
          (hw.description && hw.description.toLowerCase().includes(q)) ||
          (hw.lessonSubject && hw.lessonSubject.toLowerCase().includes(q))

        if (!match) return false
      }

      return true
    })
  }, [homework, selectedDate, selectedSubject, searchQuery])

  return (
    <div className="h-full flex flex-col p-4 md:p-6 overflow-y-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("homework.title")}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("homework.subtitle")}
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          {/* Child Selector */}
          {webtopConfig?.linkedChildren && webtopConfig.linkedChildren.length > 0 && (
            <Select value={selectedChildId} onValueChange={setSelectedChildId}>
              <SelectTrigger className="h-8 text-xs gap-1.5 px-3 flex-1 sm:flex-initial sm:min-w-[150px] bg-background border-border min-w-0">
                <div className="flex items-center gap-1.5 truncate">
                  <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
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

          {/* Sync Button */}
          {webtopConfig?.configured && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 text-xs h-8 shrink-0 ms-auto sm:ms-0"
            >
              <RefreshCw className={syncing ? "w-3.5 h-3.5 animate-spin" : "w-3.5 h-3.5"} />
              <span>{syncing ? t("homework.syncing") : t("homework.sync_now")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      {homework.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card/60 p-3 rounded-xl border border-border">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("homework.search_placeholder")}
              className="ps-9 h-9 text-xs"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto shrink-0">
            {/* Subject Filter */}
            {subjects.length > 0 && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 sm:flex-initial sm:min-w-[150px]">
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="h-9 text-xs px-3 w-full sm:w-auto min-w-0 bg-background border-border">
                      <SelectValue placeholder={t("homework.all_subjects")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("homework.all_subjects")}</SelectItem>
                      {subjects.map(s => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Date Filter */}
            <div className={cn("w-full sm:w-auto sm:min-w-[210px]", subjects.length > 0 && "ps-6 sm:ps-0")}>
              <DatePicker
                date={selectedDate}
                setDate={setSelectedDate}
                placeholder={t("common.all_dates")}
                disabled={isFutureDate}
                clearable={true}
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
              {selectedDate && !searchQuery && selectedSubject === "all"
                ? t("homework.no_homework_for_date")
                : searchQuery || selectedSubject !== "all" || selectedDate
                  ? t("homework.no_homework_match")
                  : t("homework.empty_title")}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              {searchQuery || selectedSubject !== "all" || selectedDate
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHomework.map((hw) => {
            return (
              <Card
                key={hw.id}
                className="shadow-sm border border-border hover:shadow-md transition-shadow duration-200 flex flex-col justify-between"
              >
                <CardHeader className="pb-3 space-y-2">
                  {/* Top Bar with Subject Badge & Date */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{hw.subject}</span>
                      {hw.hourNum && (
                        <span className="font-normal text-[11px] opacity-80">
                          ({t("homework.lesson_hour", { hour: hw.hourNum })})
                        </span>
                      )}
                    </span>

                    <DateBadge date={hw.dueDate} />
                  </div>

                  {/* Student Name */}
                  {hw.studentName && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span className="font-medium text-foreground">{hw.studentName}</span>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="pt-0 space-y-3">
                  {/* Teacher */}
                  {hw.teacher && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="font-medium text-foreground/80">{t("homework.teacher_label")}</span>
                      <span>{hw.teacher}</span>
                    </div>
                  )}

                  {/* Lesson Topic */}
                  {hw.lessonSubject && (
                    <div className="text-xs font-medium text-primary bg-primary/5 px-2.5 py-1 rounded-md border border-primary/10 text-start">
                      {hw.lessonSubject}
                    </div>
                  )}

                  {/* Homework Description / Instructions */}
                  {hw.description && hw.description !== hw.lessonSubject && (
                    <p className="text-xs bg-muted/40 p-2.5 rounded-md border border-border/50 text-start leading-relaxed text-foreground/90">
                      {hw.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default HomeworkPage
