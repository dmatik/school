import { useState, useEffect, useMemo, useCallback } from "react"
import { useTranslation } from "react-i18next"
import {
  AlertCircle,
  RefreshCw,
  Search,
  User,
  GraduationCap,
  CheckCircle2,
  Loader2,
  Calendar
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
import { cn, parseLocalDate } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { he, enUS } from "date-fns/locale"
import { DatePicker } from "@/components/ui/date-picker"
import { getSubjectIcon } from "@/lib/subject-icons"
import { getChildBadgeClasses } from "@/lib/child-colors"
import type { Incident, WebtopConfig } from "@/types"

interface IncidentsPageProps {
  token?: string | null
}

export function IncidentsPage({ token }: IncidentsPageProps) {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.dir() === "rtl"
  const dateLocale = isRtl ? he : enUS

  const formatOneLineDate = useCallback((dateInput?: string | Date | null) => {
    if (!dateInput) return ""
    try {
      const d = parseLocalDate(dateInput)
      return format(d, "EEEE, PPP", { locale: dateLocale })
    } catch {
      return ""
    }
  }, [dateLocale])

  const [incidents, setIncidents] = useState<Incident[]>([])
  const [webtopConfig, setWebtopConfig] = useState<WebtopConfig | null>(null)
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
      const [configRes, incRes] = await Promise.all([
        fetch("/api/webtop/config", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/incidents?childId=${encodeURIComponent(selectedChildId)}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      if (configRes.ok) {
        const configData: WebtopConfig = await configRes.json()
        setWebtopConfig(configData)
      }

      if (incRes.ok) {
        const incData = await incRes.json()
        setIncidents(incData.incidents || [])
      }
    } catch (err) {
      console.error("Failed to load incidents data:", err)
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

  // Unique types list for filtering
  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    const list = incidents.filter(inc => {
      // Date filter
      if (selectedDate) {
        const formattedFilter = format(selectedDate, "yyyy-MM-dd")
        if (inc.date !== formattedFilter) {
          return false
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const match =
          (inc.type && inc.type.toLowerCase().includes(q)) ||
          (inc.subject && inc.subject.toLowerCase().includes(q)) ||
          (inc.teacher && inc.teacher.toLowerCase().includes(q)) ||
          (inc.studentName && inc.studentName.toLowerCase().includes(q)) ||
          (inc.description && inc.description.toLowerCase().includes(q))

        if (!match) return false
      }

      return true
    })

    // Deduplicate in UI by ID or eventCode + date + studentName
    const deduped: Incident[] = []
    const seen = new Set<string>()
    for (const inc of list) {
      const key = inc.id || `${inc.studentName}::${inc.date}::${inc.type}::${inc.hourNum || 0}`
      if (!seen.has(key)) {
        seen.add(key)
        deduped.push(inc)
      }
    }

    return deduped
  }, [incidents, selectedDate, searchQuery])

  return (
    <div className="h-full flex flex-col p-4 md:p-6 overflow-y-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {t("incidents.title")}
          </h1>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          {/* Child Selector */}
          {webtopConfig?.linkedChildren && webtopConfig.linkedChildren.length > 0 && (
            <Select value={selectedChildId} onValueChange={setSelectedChildId}>
              <SelectTrigger className="h-9 text-sm gap-2 px-3 flex-1 sm:flex-initial sm:min-w-[160px] bg-background border-border min-w-0">
                <div className="flex items-center gap-2 truncate">
                  <User className="w-4 h-4 text-muted-foreground shrink-0" />
                  <SelectValue placeholder={t("incidents.all_students")} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("incidents.all_students")}</SelectItem>
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
              className="flex items-center gap-2 text-sm h-9 shrink-0 ms-auto sm:ms-0 px-3"
            >
              <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
              <span>{syncing ? t("incidents.syncing") : t("incidents.sync_now")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Search & Date Filter */}
      {incidents.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 sm:max-w-md">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("incidents.search_placeholder")}
              className="ps-9 h-9 text-sm"
            />
          </div>

          {/* Date Filter */}
          <div className="w-full sm:w-auto sm:min-w-[220px]">
            <DatePicker
              date={selectedDate}
              setDate={setSelectedDate}
              placeholder={t("common.all_dates")}
              disabled={isFutureDate}
              clearable={true}
            />
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
              <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 shadow-inner">
                <GraduationCap className="w-7 h-7" />
              </div>
              <CardTitle className="text-xl font-bold">
                {t("incidents.empty_title")}
              </CardTitle>
              <CardDescription className="text-sm max-w-md mx-auto pt-1">
                {t("incidents.empty_desc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="rounded-xl bg-muted/60 p-4 border border-border flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary mt-0.5 shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="space-y-1 text-start">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-foreground">
                      {t("incidents.status_title")}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      {t("incidents.integration_badge")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t("incidents.status_desc")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
          <Card className="w-full max-w-md border-dashed border-2 shadow-sm text-center p-8 bg-card/40">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-base text-foreground">
              {searchQuery || selectedDate
                ? t("incidents.no_incidents_match")
                : t("incidents.empty_title")}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              {searchQuery || selectedDate
                ? t("incidents.search_placeholder")
                : t("incidents.empty_desc")}
            </p>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIncidents.map((inc) => {
            const SubjectIcon = getSubjectIcon(inc.subject)
            const matchedChild = webtopConfig?.linkedChildren?.find(
              (c) => c.id === inc.studentId || `${c.firstName} ${c.lastName}`.trim() === inc.studentName?.trim()
            )
            const childBadgeClass = getChildBadgeClasses(matchedChild?.color)

            return (
              <Card
                key={inc.id}
                className="shadow-sm border border-border hover:shadow-md transition-shadow duration-200 flex flex-col"
              >
                <CardHeader className={cn("p-2.5 sm:p-3 space-y-1", inc.description && "pb-1.5 sm:pb-2")}>
                  <div className="flex items-start justify-between gap-2.5">
                    {/* Right side (Hebrew/RTL start): Incident type, Date (one line, no badge), Subject & Teacher */}
                    <div className="space-y-1 min-w-0">
                      {/* Incident Name / Type as text with color, no badge */}
                      <span className="font-bold text-base text-amber-700 dark:text-amber-400 block truncate">
                        {inc.type}
                      </span>

                      {/* Date in one line, no badge, below incident name */}
                      {inc.date && (
                        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                          <Calendar className="w-4 h-4 text-muted-foreground/80 shrink-0" />
                          <span>{formatOneLineDate(inc.date)}</span>
                        </div>
                      )}

                      {/* Subject with lesson hour - without accent color on icon */}
                      {inc.subject && (
                        <div className="text-sm text-foreground font-medium flex items-center gap-1.5">
                          <SubjectIcon className="w-4 h-4 text-muted-foreground/80 shrink-0" />
                          <span className="truncate">{inc.subject}</span>
                          {inc.hourNum && (
                            <span className="text-xs font-normal text-muted-foreground shrink-0">
                              • {t("incidents.lesson_hour", { hour: inc.hourNum })}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Teacher name with user icon */}
                      {inc.teacher && (
                        <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                          <User className="w-4 h-4 text-muted-foreground/80 shrink-0" />
                          <span className="truncate">{inc.teacher}</span>
                        </div>
                      )}
                    </div>

                    {/* Left side (Hebrew/RTL end): Kid name as badge without icon */}
                    {inc.studentName && (
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border shrink-0 shadow-xs transition-colors",
                        childBadgeClass
                      )}>
                        <span className="truncate max-w-[130px] sm:max-w-none">{inc.studentName}</span>
                      </span>
                    )}
                  </div>
                </CardHeader>

                {inc.description && (
                  <CardContent className="p-2.5 sm:p-3 pt-1 sm:pt-1.5">
                    {/* Remark / Description */}
                    <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-md border border-border/50 text-start leading-snug">
                      {inc.description}
                    </p>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default IncidentsPage
