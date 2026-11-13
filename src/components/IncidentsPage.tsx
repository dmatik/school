import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/ui/page-header"
import { LiquidTabs } from "@/components/ui/liquid-tabs"
import { SearchInput } from "@/components/ui/search-input"
import {
  GraduationCap,
  CheckCircle2,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyStateCard } from "@/components/ui/empty-state-card"
import { NoticeBanner } from "@/components/ui/notice-banner"
import { cn, getChildFirstName } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { LiquidDatePicker } from "@/components/ui/liquid-date-picker"
import { SectionDateHeader } from "@/components/ui/section-date-header"
import { IncidentCard } from "@/components/ui/incident-card"
import type { Incident, WebtopConfig, User as UserType } from "@/types"

interface IncidentsPageProps {
  token?: string | null
  syncTrigger?: number
  currentUser?: UserType | null
}

export function IncidentsPage({ token, syncTrigger, currentUser }: IncidentsPageProps) {
  const { t } = useTranslation()
  const isChild = currentUser?.familyRole === "child"

  const [incidents, setIncidents] = useState<Incident[]>([])
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

    // Deduplicate in UI by canonical domain attributes (student + date + type + subject + hourNum)
    const deduped: Incident[] = []
    const seen = new Set<string>()
    for (const inc of list) {
      const studentKey = (inc.studentName?.trim() || inc.childId?.trim() || inc.studentId?.trim() || "").toLowerCase()
      const key = `${studentKey}::${inc.date || ""}::${(inc.type || "").trim()}::${(inc.subject || "").trim()}::${inc.hourNum || 0}`
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

  const childTabItems = useMemo(() => [
    { id: "all", label: t("incidents.all_short") },
    ...(webtopConfig?.linkedChildren.map((c) => ({
      id: c.id,
      label: c.firstName?.trim() || c.lastName?.trim() || ""
    })) || [])
  ], [webtopConfig?.linkedChildren, t])

  return (
    <div className="h-full flex flex-col pt-[3.75rem] pb-24 px-4 md:pt-0 md:pb-6 md:px-6 overflow-y-auto gap-4 md:gap-6 max-w-3xl mx-auto w-full">
      {/* Page Header (Desktop only) */}
      <PageHeader title={t("incidents.title")} />

      {/* Search & Filters */}
      {(incidents.length > 0 || webtopConfig?.configured) && (
        <>
          {/* Search Input */}
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t("incidents.search_placeholder")}
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
                data-incidents-child-selector
                aria-label={t("incidents.filter_child")}
                items={childTabItems}
                selectedId={selectedChildId}
                onSelect={setSelectedChildId}
                layoutId="incidentsChildLiquidPill"
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
          <EmptyStateCard
            variant="onboarding"
            icon={GraduationCap}
            iconClassName="bg-[#D4973B]/15 text-[#D4973B] dark:bg-[#D4973B]/25 dark:text-[#F5D59E]"
            title={t("incidents.empty_title")}
            description={t("incidents.empty_desc")}
            onboardingNotice={
              <NoticeBanner
                title={t("incidents.status_title")}
                badge={t("incidents.integration_badge")}
                description={t("incidents.status_desc")}
              />
            }
          />
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
          <EmptyStateCard
            icon={CheckCircle2}
            iconClassName="bg-[#2CA58D]/15 text-[#2CA58D] dark:bg-[#2CA58D]/25 dark:text-[#9EE8D8]"
            title={
              searchQuery || selectedDate
                ? t("incidents.no_incidents_match")
                : t("incidents.empty_title")
            }
            description={
              searchQuery || selectedDate
                ? null
                : (isChild && !currentUser?.linkedChildId
                    ? t("incidents.child_unlinked_desc")
                    : t("incidents.empty_desc"))
            }
            actions={
              selectedDate && (
                <div className="flex items-center justify-center gap-2">
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
              )
            }
          />
        </div>
      ) : (
        <div className="space-y-3.5 !mt-0">
          {groupedIncidents.map((group) => (
            <div key={group.date} className="space-y-1">
              {/* Date Section Header */}
              <SectionDateHeader date={group.date} />

              {/* Chat-style Continuing Feed */}
              <div className="flex flex-col gap-2.5 sm:gap-3">
                {group.items.map((inc) => {
                  const matchedChild = webtopConfig?.linkedChildren?.find(
                    (c) =>
                      (inc.childId && c.id === inc.childId) ||
                      (inc.studentId && (c.id === inc.studentId || (c.externalId && c.externalId === inc.studentId))) ||
                      (inc.studentName && `${c.firstName} ${c.lastName}`.trim() === inc.studentName.trim())
                  )
                  const childDisplayName = getChildFirstName(inc.studentName, matchedChild) || inc.studentName

                  return (
                    <IncidentCard
                      key={inc.id}
                      subject={inc.subject}
                      type={inc.type}
                      hourNum={inc.hourNum}
                      teacher={inc.teacher}
                      childName={!isChild ? childDisplayName : null}
                      childColorId={!isChild ? matchedChild?.color : null}
                      description={inc.description}
                    />
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
