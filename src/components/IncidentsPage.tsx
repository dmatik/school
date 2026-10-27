import { useState, useEffect, useMemo, useCallback } from "react"
import { useTranslation } from "react-i18next"
import {
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  User,
  GraduationCap,
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  BookOpen
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
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import type { Incident, WebtopConfig } from "@/types"

interface IncidentsPageProps {
  token?: string | null
}

export function IncidentsPage({ token }: IncidentsPageProps) {
  const { t } = useTranslation()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [webtopConfig, setWebtopConfig] = useState<WebtopConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [selectedChildId, setSelectedChildId] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

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

  // Unique types list for filtering
  const eventTypes = useMemo(() => {
    const set = new Set<string>()
    for (const inc of incidents) {
      if (inc.type) set.add(inc.type)
    }
    return Array.from(set)
  }, [incidents])

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      // Type filter
      if (selectedType !== "all" && inc.type !== selectedType) {
        return false
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
  }, [incidents, selectedType, searchQuery])

  return (
    <div className="h-full flex flex-col p-4 md:p-6 overflow-y-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("incidents.title")}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("incidents.subtitle")}
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Child Selector */}
          {webtopConfig?.linkedChildren && webtopConfig.linkedChildren.length > 0 && (
            <Select value={selectedChildId} onValueChange={setSelectedChildId}>
              <SelectTrigger className="h-8 text-xs gap-1.5 px-3 min-w-[140px] bg-background border-border">
                <div className="flex items-center gap-1.5 truncate">
                  <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
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
              className="flex items-center gap-1.5 text-xs h-8"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
              <span>{syncing ? t("incidents.syncing") : t("incidents.sync_now")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      {incidents.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card/60 p-3 rounded-xl border border-border">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("incidents.search_placeholder")}
              className="ps-9 h-9 text-xs"
            />
          </div>

          {/* Event Type Filter */}
          {eventTypes.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-9 text-xs px-3 min-w-[150px] sm:min-w-[170px] bg-background border-border">
                  <SelectValue placeholder={t("incidents.all_types")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("incidents.all_types")}</SelectItem>
                  {eventTypes.map(typ => (
                    <SelectItem key={typ} value={typ}>
                      {typ}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
              {searchQuery || selectedType !== "all"
                ? t("incidents.no_incidents_match")
                : t("incidents.empty_title")}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              {searchQuery || selectedType !== "all"
                ? t("incidents.search_placeholder")
                : t("incidents.empty_desc")}
            </p>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIncidents.map((inc) => {
            const isJustified = Boolean(inc.isJustified)
            return (
              <Card
                key={inc.id}
                className="shadow-sm border border-border hover:shadow-md transition-shadow duration-200 flex flex-col justify-between"
              >
                <CardHeader className="pb-3 space-y-2">
                  {/* Top Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                      {inc.type}
                    </span>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(inc.date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Student & Subject */}
                  <div>
                    {inc.studentName && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <User className="w-3 h-3" />
                        <span className="font-medium text-foreground">{inc.studentName}</span>
                      </div>
                    )}
                    {inc.subject && (
                      <h3 className="font-bold text-base text-foreground flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <span>{inc.subject}</span>
                        {inc.hourNum && (
                          <span className="text-xs font-normal text-muted-foreground">
                            • {t("incidents.lesson_hour", { hour: inc.hourNum })}
                          </span>
                        )}
                      </h3>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-3">
                  {/* Teacher */}
                  {inc.teacher && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="font-medium text-foreground/80">{t("incidents.teacher_label")}</span>
                      <span>{inc.teacher}</span>
                    </div>
                  )}

                  {/* Remark / Description */}
                  {inc.description && (
                    <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-md border border-border/50 text-start leading-relaxed">
                      {inc.description}
                    </p>
                  )}

                  {/* Justified Status */}
                  <div className="pt-1 flex items-center justify-end">
                    {isJustified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{t("incidents.justified")}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/20">
                        <XCircle className="w-3 h-3" />
                        <span>{t("incidents.not_justified")}</span>
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default IncidentsPage
