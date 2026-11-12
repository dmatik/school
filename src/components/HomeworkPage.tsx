import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/ui/page-header"
import { LiquidTabs } from "@/components/ui/liquid-tabs"
import { SearchInput } from "@/components/ui/search-input"
import {
  BookOpen,
  GraduationCap,
  Loader2
} from "lucide-react"
import { EmptyStateCard } from "@/components/ui/empty-state-card"
import { NoticeBanner } from "@/components/ui/notice-banner"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { LiquidDatePicker } from "@/components/ui/liquid-date-picker"
import { SectionDateHeader } from "@/components/ui/section-date-header"
import { HomeworkCard } from "@/components/ui/homework-card"
import { cn, getHomeworkText, consolidateHomework, getChildFirstName } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import type { HomeworkItem, ConsolidatedHomeworkItem, WebtopConfig, User as UserType } from "@/types"

interface HomeworkPageProps {
  token?: string | null
  syncTrigger?: number
  currentUser?: UserType | null
}

export function HomeworkPage({ token, syncTrigger, currentUser }: HomeworkPageProps) {
  const { t } = useTranslation()
  const isChild = currentUser?.familyRole === "child"

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
          <EmptyStateCard
            variant="onboarding"
            icon={GraduationCap}
            iconClassName="bg-[#555DB0]/15 text-[#555DB0] dark:bg-[#555DB0]/25 dark:text-[#C5C8F5]"
            title={t("homework.empty_title")}
            description={t("homework.empty_desc")}
            onboardingNotice={
              <NoticeBanner
                title={t("homework.status_title")}
                badge={t("homework.integration_badge")}
                description={t("homework.status_desc")}
              />
            }
          />
        </div>
      ) : filteredHomework.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
          <EmptyStateCard
            icon={BookOpen}
            iconClassName="bg-[#555DB0]/15 text-[#555DB0] dark:bg-[#555DB0]/25 dark:text-[#C5C8F5]"
            title={
              selectedDate && !searchQuery
                ? t("homework.no_homework_for_date")
                : searchQuery || selectedDate
                  ? t("homework.no_homework_match")
                  : t("homework.empty_title")
            }
            description={
              searchQuery || selectedDate
                ? null
                : (isChild && !currentUser?.linkedChildId
                    ? t("homework.child_unlinked_desc")
                    : t("homework.empty_desc"))
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
          {groupedHomework.map((group) => (
            <div key={group.date} className="space-y-1">
              {/* Date Section Header */}
              <SectionDateHeader date={group.date} />

              {/* Chat-style Continuing Feed */}
              <div className="flex flex-col gap-2.5 sm:gap-3">
                {group.items.map((hw) => {
                  const matchedChild = webtopConfig?.linkedChildren?.find(
                    (c) =>
                      (hw.childId && c.id === hw.childId) ||
                      (hw.studentId && (c.id === hw.studentId || (c.externalId && c.externalId === hw.studentId))) ||
                      (hw.studentName && `${c.firstName} ${c.lastName}`.trim() === hw.studentName.trim())
                  )
                  const childDisplayName = getChildFirstName(hw.studentName, matchedChild) || hw.studentName
                  const homeworkText = getHomeworkText(hw)

                  return (
                    <HomeworkCard
                      key={hw.id}
                      subject={hw.subject}
                      lessonHour={hw.hourNum}
                      lessonHours={hw.hourNums}
                      teacher={hw.teacher}
                      childName={!isChild ? childDisplayName : null}
                      childColorId={!isChild ? matchedChild?.color : null}
                      homeworkText={homeworkText}
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

export default HomeworkPage
