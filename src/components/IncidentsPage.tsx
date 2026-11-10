import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { motion } from "framer-motion"
import {
  AlertCircle,
  Search,
  GraduationCap,
  CheckCircle2,
  Loader2,
  X
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn, parseLocalDate, getChildFirstName } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { format, isToday, isYesterday } from "date-fns"
import { he, enUS } from "date-fns/locale"
import { DatePicker } from "@/components/ui/date-picker"
import { getSubjectConfig } from "@/lib/subject-icons"
import { getChildBadgeClasses, getChildAccentColor } from "@/lib/child-colors"
import type { Incident, WebtopConfig, User as UserType } from "@/types"

interface IncidentsPageProps {
  token?: string | null
  syncTrigger?: number
  currentUser?: UserType | null
}

export function IncidentsPage({ token, syncTrigger, currentUser }: IncidentsPageProps) {
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

  const [incidents, setIncidents] = useState<Incident[]>([])
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

    // Deduplicate in UI by canonical eventID (or eventCode + date + student + hourNum)
    const deduped: Incident[] = []
    const seen = new Set<string>()
    for (const inc of list) {
      let eventIdKey = ""
      if (inc.rawData) {
        try {
          const parsed = typeof inc.rawData === "string" ? JSON.parse(inc.rawData) : inc.rawData
          if (parsed && parsed.eventID) {
            eventIdKey = `eventID::${parsed.eventID}`
          }
        } catch {
          // ignore
        }
      }
      const studentKey = (inc.childId?.trim() || inc.studentId?.trim() || inc.studentName?.trim() || "").toLowerCase()
      const key = eventIdKey || `${studentKey}::${inc.date}::${inc.type}::${inc.subject || ""}::${inc.hourNum || 0}::${inc.eventCode || ""}`
      if (!seen.has(key)) {
        seen.add(key)
        deduped.push(inc)
      }
    }

    return deduped
  }, [incidents, selectedDate, searchQuery])

  // Group filtered incidents by date
  const groupedIncidents = useMemo(() => {
    const groups: { date: string; items: Incident[] }[] = []
    const map = new Map<string, Incident[]>()

    for (const inc of filteredIncidents) {
      const key = inc.date || "no-date"
      let list = map.get(key)
      if (!list) {
        list = []
        map.set(key, list)
        groups.push({ date: key, items: list })
      }
      list.push(inc)
    }

    return groups
  }, [filteredIncidents])

  const hasChildFilter = !isChild && Boolean(webtopConfig?.linkedChildren && webtopConfig.linkedChildren.length > 0)

  return (
    <div className="h-full flex flex-col pt-[3.75rem] pb-24 px-4 md:pt-0 md:pb-6 md:px-6 overflow-y-auto gap-4 md:gap-6 max-w-3xl mx-auto w-full">
      {/* Page Header (Desktop only) */}
      <div data-page-title className="hidden md:flex md:sticky md:top-0 md:z-30 md:bg-background md:pt-6 items-center justify-between gap-3 pb-2 border-b border-border/70 dark:border-border/60 shrink-0">
        <h1 className="text-lg font-bold tracking-tight text-foreground truncate">
          {t("incidents.title")}
        </h1>
      </div>

      {/* Search & Filters */}
      {(incidents.length > 0 || webtopConfig?.configured) && (
        <>
          {/* Search Input */}
          <div className="relative w-full shrink-0 -mb-1.5 md:-mb-3.5">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("incidents.search_placeholder")}
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
          <div
            data-sticky-filters
            className={cn(
              "sticky top-0 md:top-[61px] z-20 flex items-center gap-2 pt-0.5 pb-0.5 shrink-0",
              hasChildFilter ? "justify-between" : "justify-start"
            )}
          >
            {/* 1 - Children Liquid Glass Selector (Parents only) */}
            {hasChildFilter && (
              <div
                role="tablist"
                aria-label={t("incidents.filter_child")}
                data-incidents-child-selector
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
                      layoutId="incidentsChildLiquidPill"
                      transition={{
                        type: "spring",
                        stiffness: 450,
                        damping: 35
                      }}
                      className="absolute inset-0 rounded-full apple-liquid-pill"
                    />
                  )}
                  <span className="relative z-10 truncate">
                    {t("incidents.all_short")}
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
                          layoutId="incidentsChildLiquidPill"
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
              <div className="mx-auto w-14 h-14 rounded-2xl bg-[#D4973B]/15 text-[#D4973B] dark:bg-[#D4973B]/25 dark:text-[#F5D59E] flex items-center justify-center mb-3 shadow-inner">
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
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#3B82C4]/15 text-[#3B82C4] dark:bg-[#3B82C4]/25 dark:text-[#AED4F8] border border-transparent">
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
            <div className="w-12 h-12 rounded-full bg-[#2CA58D]/15 text-[#2CA58D] dark:bg-[#2CA58D]/25 dark:text-[#9EE8D8] flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-base text-foreground">
              {searchQuery || selectedDate
                ? t("incidents.no_incidents_match")
                : t("incidents.empty_title")}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              {searchQuery || selectedDate
                ? null
                : (isChild && !currentUser?.linkedChildId
                    ? t("incidents.child_unlinked_desc")
                    : t("incidents.empty_desc"))}
            </p>
          </Card>
        </div>
      ) : (
        <div className="space-y-3.5 !mt-0">
          {groupedIncidents.map((group) => (
            <div key={group.date} className="space-y-1">
              {/* Date Section Header: No badge, aligned to beginning of the row */}
              <div className="flex justify-start pt-1 pb-1 px-1">
                <h2 className="text-sm sm:text-base font-semibold text-muted-foreground tracking-tight select-none text-start">
                  {formatOneLineDate(group.date) || group.date}
                </h2>
              </div>

              {/* Chat-style Continuing Feed */}
              <div className="flex flex-col gap-2.5 sm:gap-3">
                {group.items.map((inc) => {
                  const subjectTitle = inc.subject || inc.type
                  const hasSubject = Boolean(inc.subject?.trim())
                  const subjectConfig = getSubjectConfig(subjectTitle)
                  const SubjectIcon = subjectConfig.icon
                  const subjectBadgeClass = subjectConfig.solidBadgeClass
                  const matchedChild = webtopConfig?.linkedChildren?.find(
                    (c) =>
                      (inc.childId && c.id === inc.childId) ||
                      (inc.studentId && (c.id === inc.studentId || (c.externalId && c.externalId === inc.studentId))) ||
                      (inc.studentName && `${c.firstName} ${c.lastName}`.trim() === inc.studentName.trim())
                  )
                  const childBadgeClass = getChildBadgeClasses(matchedChild?.color)
                  const childAccentClass = getChildAccentColor(matchedChild?.color)
                  const childDisplayName = getChildFirstName(inc.studentName, matchedChild) || inc.studentName
                  const incidentDetail = hasSubject ? (inc.type || inc.description) : inc.description

                  return (
                    <Card
                      key={inc.id}
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
                              {subjectTitle}
                            </span>
                            {inc.hourNum ? (
                              <span className="font-normal text-xs sm:text-sm text-muted-foreground truncate text-start">
                                {t("incidents.lesson_hour", { hour: inc.hourNum })}
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
                      {inc.teacher && (
                        <div className="text-sm text-muted-foreground font-medium text-start truncate">
                          {inc.teacher}
                        </div>
                      )}

                      {/* Incident type & description below: unboxed, separated by hairline divider */}
                      {incidentDetail ? (
                        <div className="text-base font-normal text-start leading-relaxed text-foreground whitespace-pre-line pt-2.5 border-t border-border/60 dark:border-border/50">
                          {hasSubject && inc.type ? (
                            <>
                              <span className="font-normal text-foreground">
                                {inc.type}
                              </span>
                              {inc.description ? (
                                <span className="font-normal me-1.5 text-foreground">:</span>
                              ) : null}
                              {inc.description ? " " : null}
                            </>
                          ) : null}
                          {inc.description && (
                            <span className="font-normal">
                              {inc.description}
                            </span>
                          )}
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

export default IncidentsPage
