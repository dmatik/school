import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { motion } from "framer-motion"
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Calendar as CalendarIcon,
  Award,
  GraduationCap,
  X
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { format, isToday, isYesterday, isTomorrow } from "date-fns"
import { he, enUS } from "date-fns/locale"
import { DatePicker } from "@/components/ui/date-picker"
import { cn, parseLocalDate, getChildFirstName } from "@/lib/utils"
import { getSubjectConfig } from "@/lib/subject-icons"
import { getChildBadgeClasses } from "@/lib/child-colors"
import { toast } from "@/hooks/use-toast"
import type { ExamItem, WebtopConfig, User as UserType } from "@/types"

interface ExamsPageProps {
  token?: string | null
  syncTrigger?: number
  currentUser?: UserType | null
}

type PeriodFilter = "future" | "past"

export function ExamsPage({ token, syncTrigger, currentUser }: ExamsPageProps) {
  const { t, i18n } = useTranslation()
  const isChild = currentUser?.familyRole === "child"
  const isParent = !isChild
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
      if (isTomorrow(d)) {
        return t("common.tomorrow")
      }
      if (isYesterday(d)) {
        return t("common.yesterday")
      }
      return format(d, "EEEE, PPP", { locale: dateLocale })
    } catch {
      return ""
    }
  }, [dateLocale, t])

  const [exams, setExams] = useState<ExamItem[]>([])
  const [webtopConfig, setWebtopConfig] = useState<WebtopConfig | null>(null)
  const webtopConfigRef = useRef<WebtopConfig | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters: default period is always "future"
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("future")
  const [selectedChildId, setSelectedChildId] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeExam, setActiveExam] = useState<ExamItem | null>(null)
  const [examToDelete, setExamToDelete] = useState<ExamItem | null>(null)

  // Form states
  const [formChildId, setFormChildId] = useState<string>("")
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formDate, setFormDate] = useState<Date | undefined>(new Date())
  const [formGrade, setFormGrade] = useState("")

  const loadData = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const [configRes, examsRes] = await Promise.all([
        fetch("/api/webtop/config", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/exams?childId=${encodeURIComponent(selectedChildId)}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      if (configRes.ok) {
        const configData: WebtopConfig = await configRes.json()
        const prevConfig = webtopConfigRef.current
        webtopConfigRef.current = configData
        setWebtopConfig(configData)

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

      if (examsRes.ok) {
        const examsData = await examsRes.json()
        setExams(examsData.exams || [])
      }
    } catch (err) {
      console.error("Failed to load exams data:", err)
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("exams.fetch_failed")
      })
    } finally {
      setLoading(false)
    }
  }, [token, selectedChildId, t])

  useEffect(() => {
    loadData()
  }, [loadData, syncTrigger])

  // Filter and sort exams
  const filteredExams = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd")

    const list = exams.filter(exam => {
      // Period filter: future includes today and all dates after today
      if (selectedPeriod === "future") {
        if (exam.date < todayStr) return false
      } else {
        if (exam.date >= todayStr) return false
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const match =
          exam.name.toLowerCase().includes(q) ||
          (exam.description && exam.description.toLowerCase().includes(q)) ||
          (exam.studentName && exam.studentName.toLowerCase().includes(q)) ||
          (exam.grade && exam.grade.toLowerCase().includes(q))
        if (!match) return false
      }

      return true
    })

    // Sort order:
    // Future feed: ordered from today to future dates (ascending chronological)
    // Past feed: ordered from most recent past to older dates (descending)
    list.sort((a, b) => {
      if (selectedPeriod === "future") {
        return a.date.localeCompare(b.date)
      } else {
        return b.date.localeCompare(a.date)
      }
    })

    return list
  }, [exams, selectedPeriod, searchQuery])

  // Group filtered exams by date
  const groupedExams = useMemo(() => {
    const groups: { date: string; items: ExamItem[] }[] = []
    const map = new Map<string, ExamItem[]>()

    for (const exam of filteredExams) {
      const key = exam.date || "no-date"
      let list = map.get(key)
      if (!list) {
        list = []
        map.set(key, list)
        groups.push({ date: key, items: list })
      }
      list.push(exam)
    }

    return groups
  }, [filteredExams])

  // Open Add Exam modal
  const handleOpenAddModal = () => {
    const defaultChild =
      webtopConfig?.linkedChildren && webtopConfig.linkedChildren.length > 0
        ? (selectedChildId !== "all" && webtopConfig.linkedChildren.some(c => c.id === selectedChildId)
            ? selectedChildId
            : webtopConfig.linkedChildren[0].id)
        : ""
    setFormChildId(defaultChild)
    setFormName("")
    setFormDescription("")
    setFormDate(new Date())
    setFormGrade("")
    setIsAddOpen(true)
  }

  // Open Edit Exam modal
  const handleOpenEditModal = (exam: ExamItem) => {
    setActiveExam(exam)
    const matchedChild = webtopConfig?.linkedChildren?.find(
      c => c.id === exam.childId || (c.externalId && c.externalId === exam.childId)
    )
    setFormChildId(matchedChild ? matchedChild.id : exam.childId)
    setFormName(exam.name)
    setFormDescription(exam.description || "")
    setFormDate(parseLocalDate(exam.date))
    setFormGrade(exam.grade || "")
    setIsEditOpen(true)
  }

  // Save new Exam
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !formChildId || !formName.trim() || !formDate || isNaN(formDate.getTime())) return

    setIsSubmitting(true)
    try {
      const formattedDate = format(formDate, "yyyy-MM-dd")
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          childId: formChildId,
          name: formName.trim(),
          description: formDescription.trim(),
          date: formattedDate,
          grade: formGrade.trim()
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || data.error || t("exams.save_failed"))
      }

      toast({
        variant: "success",
        title: t("exams.exam_created_title"),
        description: t("exams.exam_created_desc", { name: formName.trim() })
      })

      setIsAddOpen(false)
      loadData()
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("exams.save_failed")
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update existing Exam
  const handleUpdateExam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !activeExam || !formChildId || !formName.trim() || !formDate || isNaN(formDate.getTime())) return

    setIsSubmitting(true)
    try {
      const formattedDate = format(formDate, "yyyy-MM-dd")
      const res = await fetch(`/api/exams/${activeExam.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          childId: formChildId,
          name: formName.trim(),
          description: formDescription.trim(),
          date: formattedDate,
          grade: formGrade.trim()
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || data.error || t("exams.save_failed"))
      }

      toast({
        variant: "success",
        title: t("exams.exam_updated_title"),
        description: t("exams.exam_updated_desc", { name: formName.trim() })
      })

      setIsEditOpen(false)
      setActiveExam(null)
      loadData()
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("exams.save_failed")
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete Exam
  const handleDeleteExam = async () => {
    if (!token || !examToDelete || isDeleting) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/exams/${examToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        throw new Error(t("exams.delete_failed"))
      }

      toast({
        variant: "success",
        title: t("exams.exam_deleted_title"),
        description: t("exams.exam_deleted_desc")
      })

      setExamToDelete(null)
      setIsEditOpen(false)
      setActiveExam(null)
      loadData()
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("exams.delete_failed")
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="h-full flex flex-col pt-16 pb-[calc(max(0.625rem,env(safe-area-inset-bottom)-10px)+10rem)] px-4 md:pt-6 md:pb-28 md:px-6 overflow-y-auto space-y-6 max-w-3xl mx-auto w-full">
        {/* Page Header with Title */}
      <div data-page-title className="flex items-center justify-between gap-3 pb-2 border-b border-border/70 dark:border-border/60">
        <h1 className="text-lg font-bold tracking-tight text-foreground truncate">
          {t("exams.title")}
        </h1>
      </div>

      {/* Filter Area: Search, Child Selector & Period Selector (Future vs Past) */}
      <div className="flex flex-col gap-2.5 shrink-0">
        {/* Search Input (iOS 26/27 greyish background) */}
        <div className="relative w-full">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("exams.search_placeholder")}
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

        {/* Liquid Glass Filter Row: Child selector at beginning of row, Period selector at end of row */}
        <div className="flex items-center justify-between gap-2 pt-1 pb-2 shrink-0">
          {/* 1 - Children Liquid Glass Selector (Parents only) */}
          {!isChild && webtopConfig?.linkedChildren && webtopConfig.linkedChildren.length > 0 && (
            <div
              role="tablist"
              aria-label={t("exams.filter_child")}
              data-exams-child-selector
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
                    layoutId="examsChildLiquidPill"
                    transition={{
                      type: "spring",
                      stiffness: 450,
                      damping: 35
                    }}
                    className="absolute inset-0 rounded-full apple-liquid-pill"
                  />
                )}
                <span className="relative z-10 truncate">
                  {t("exams.all_short")}
                </span>
              </motion.button>

              {/* Children options */}
              {webtopConfig.linkedChildren.map((c) => {
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
                        layoutId="examsChildLiquidPill"
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

          {/* 2 - Future / Past Liquid Glass Selector (at the end of the row) */}
          <div
            role="tablist"
            aria-label={t("exams.filter_period")}
            data-exams-period-selector
            className="inline-flex items-center p-1 h-10 rounded-full apple-liquid-dock ms-auto shrink-0"
          >
            {(["future", "past"] as const).map((period) => {
              const isActive = selectedPeriod === period
              const label = period === "future" ? t("exams.period_future") : t("exams.period_past")

              return (
                <motion.button
                  key={period}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedPeriod(period)}
                  className={cn(
                    "relative flex items-center justify-center h-8 px-4 rounded-full text-base font-medium transition-colors select-none shrink-0 focus:outline-none focus-visible:outline-none",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="examsPeriodLiquidPill"
                      transition={{
                        type: "spring",
                        stiffness: 450,
                        damping: 35
                      }}
                      className="absolute inset-0 rounded-full apple-liquid-pill"
                    />
                  )}
                  <span className="relative z-10 truncate">
                    {label}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : isChild && !currentUser?.linkedChildId ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
          <Card className="w-full max-w-md border-dashed border-2 shadow-sm text-center p-8 bg-card/40">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-base text-foreground">
              {t("exams.title")}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              {t("exams.child_unlinked_desc")}
            </p>
          </Card>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
          <Card className="w-full max-w-md border-dashed border-2 shadow-sm text-center p-8 bg-card/40">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-base text-foreground">
              {searchQuery
                ? t("exams.no_exams_match")
                : selectedPeriod === "future"
                  ? t("exams.empty_future_title")
                  : t("exams.empty_past_title")}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              {searchQuery
                ? null
                : selectedPeriod === "future"
                  ? t("exams.empty_future_desc")
                  : t("exams.empty_past_desc")}
            </p>
          </Card>
        </div>
      ) : (
        <div className="space-y-4 !mt-4">
          {groupedExams.map((group) => (
            <div key={group.date} className="space-y-1">
              {/* Floating Chat Date Pill */}
              <div className="flex justify-center sticky top-0 z-10 pt-0.5 pb-0.5 pointer-events-none">
                <h2 className="pointer-events-auto px-3.5 py-1 rounded-full text-xs font-semibold text-muted-foreground tracking-tight bg-card/85 dark:bg-card/80 border border-transparent shadow-xs backdrop-blur-md select-none">
                  {formatOneLineDate(group.date) || group.date}
                </h2>
              </div>

              {/* Feed Cards */}
              <div className="flex flex-col gap-2.5 sm:gap-3">
                {group.items.map((exam) => {
                  const subjectConfig = getSubjectConfig(exam.name)
                  const SubjectIcon = subjectConfig.icon
                  const subjectBadgeClass = subjectConfig.badgeClass
                  const matchedChild = webtopConfig?.linkedChildren?.find(
                    (c) =>
                      (exam.childId && (c.id === exam.childId || c.externalId === exam.childId)) ||
                      (exam.studentName && `${c.firstName} ${c.lastName}`.trim() === exam.studentName.trim())
                  )
                  const childBadgeClass = getChildBadgeClasses(matchedChild?.color)
                  const childDisplayName = getChildFirstName(exam.studentName, matchedChild) || exam.studentName

                  return (
                    <Card
                      key={exam.id}
                      className="shadow-xs border border-transparent hover:shadow-sm transition-all duration-200 flex flex-col p-3 sm:p-3.5 gap-2.5 rounded-xl sm:rounded-2xl bg-card"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          {/* Subject Icon */}
                          <div
                            className={cn(
                              "w-11 h-11 rounded-full border flex items-center justify-center shrink-0 shadow-xs",
                              subjectBadgeClass
                            )}
                          >
                            <SubjectIcon className="w-5 h-5 shrink-0" />
                          </div>

                          {/* Exam Name, Date, and Grade */}
                          <div className="min-w-0 flex-1 flex flex-col justify-center min-h-[44px]">
                            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                              <span className="font-bold text-base sm:text-lg text-foreground truncate tracking-tight">
                                {exam.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground font-medium mt-0.5">
                              {/* Date info */}
                              <span className="inline-flex items-center gap-1.5">
                                <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0 -translate-y-[1px]" />
                                <span className="leading-none">{format(parseLocalDate(exam.date), "dd/MM/yyyy")}</span>
                              </span>

                              {/* Grade badge if present */}
                              {exam.grade ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-transparent">
                                  <Award className="w-3 h-3 shrink-0" />
                                  {t("exams.grade_badge", { grade: exam.grade })}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* Top-End actions: Student Name badge (parents only) & Edit button (parents only) */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Child Badge (visible ONLY to parents) */}
                          {!isChild && childDisplayName && (
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border border-transparent shrink-0 shadow-xs transition-colors",
                                childBadgeClass
                              )}
                            >
                              <span className="truncate max-w-[120px] sm:max-w-none">{childDisplayName}</span>
                            </span>
                          )}

                          {/* Edit Exam Button (parents only) */}
                          {isParent && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditModal(exam)}
                              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                              title={t("exams.edit_exam_button")}
                            >
                              <Edit2 className="w-4 h-4" />
                              <span className="sr-only">{t("exams.edit_exam_button")}</span>
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Description below date: formatted nicely without prefix */}
                      {exam.description ? (
                        <div className="text-sm sm:text-base text-start leading-relaxed text-foreground whitespace-pre-line bg-muted/40 dark:bg-secondary/80 p-2.5 rounded-lg border border-transparent mt-0.5">
                          {exam.description}
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

      {/* Add Exam Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("exams.add_modal_title")}</DialogTitle>
            <DialogDescription>{t("exams.add_modal_desc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateExam} className="flex flex-col flex-1 space-y-4 py-2">
            {/* Child Selection */}
            <div className="space-y-2">
              <Label htmlFor="exam-add-child">{t("exams.child_label")}</Label>
              {webtopConfig?.linkedChildren && webtopConfig.linkedChildren.length > 0 ? (
                <Select value={formChildId} onValueChange={setFormChildId} required>
                  <SelectTrigger id="exam-add-child" className="bg-muted dark:bg-secondary border-transparent">
                    <SelectValue placeholder={t("exams.select_child_placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {webtopConfig.linkedChildren.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {t("exams.no_children_warning")}
                </p>
              )}
            </div>

            {/* Exam Name */}
            <div className="space-y-2">
              <Label htmlFor="exam-add-name">{t("exams.name_label")}</Label>
              <Input
                id="exam-add-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("exams.name_placeholder")}
                className="bg-muted dark:bg-secondary border-transparent"
                required
                maxLength={120}
              />
            </div>

            {/* Exam Date */}
            <div className="space-y-2">
              <Label>{t("exams.date_label")}</Label>
              <DatePicker
                date={formDate}
                setDate={setFormDate}
                clearable={false}
                formatPattern="dd/MM/yyyy"
                className="bg-muted dark:bg-secondary border-transparent"
              />
            </div>

            {/* Exam Description (Optional, below date) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="exam-add-desc">{t("exams.description_label")}</Label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formDescription.length}/200
                </span>
              </div>
              <Textarea
                id="exam-add-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={t("exams.description_placeholder")}
                rows={3}
                maxLength={200}
                className="resize-none bg-muted dark:bg-secondary border-transparent"
              />
            </div>

            {/* Grade (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="exam-add-grade">{t("exams.grade_label")}</Label>
              <Input
                id="exam-add-grade"
                value={formGrade}
                onChange={(e) => setFormGrade(e.target.value)}
                placeholder={t("exams.grade_placeholder")}
                className="bg-muted dark:bg-secondary border-transparent"
                maxLength={32}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting || !formChildId || !formName.trim()}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Exam Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("exams.edit_modal_title")}</DialogTitle>
            <DialogDescription>{t("exams.edit_modal_desc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateExam} className="flex flex-col flex-1 space-y-4 py-2">
            {/* Child Selection */}
            <div className="space-y-2">
              <Label htmlFor="exam-edit-child">{t("exams.child_label")}</Label>
              {webtopConfig?.linkedChildren && webtopConfig.linkedChildren.length > 0 ? (
                <Select value={formChildId} onValueChange={setFormChildId} required>
                  <SelectTrigger id="exam-edit-child" className="bg-muted dark:bg-secondary border-transparent">
                    <SelectValue placeholder={t("exams.select_child_placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {webtopConfig.linkedChildren.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {t("exams.no_children_warning")}
                </p>
              )}
            </div>

            {/* Exam Name */}
            <div className="space-y-2">
              <Label htmlFor="exam-edit-name">{t("exams.name_label")}</Label>
              <Input
                id="exam-edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("exams.name_placeholder")}
                className="bg-muted dark:bg-secondary border-transparent"
                required
                maxLength={120}
              />
            </div>

            {/* Exam Date */}
            <div className="space-y-2">
              <Label>{t("exams.date_label")}</Label>
              <DatePicker
                date={formDate}
                setDate={setFormDate}
                clearable={false}
                formatPattern="dd/MM/yyyy"
                className="bg-muted dark:bg-secondary border-transparent"
              />
            </div>

            {/* Exam Description (Optional, below date) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="exam-edit-desc">{t("exams.description_label")}</Label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formDescription.length}/200
                </span>
              </div>
              <Textarea
                id="exam-edit-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={t("exams.description_placeholder")}
                rows={3}
                maxLength={200}
                className="resize-none bg-muted dark:bg-secondary border-transparent"
              />
            </div>

            {/* Grade (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="exam-edit-grade">{t("exams.grade_label")}</Label>
              <Input
                id="exam-edit-grade"
                value={formGrade}
                onChange={(e) => setFormGrade(e.target.value)}
                placeholder={t("exams.grade_placeholder")}
                className="bg-muted dark:bg-secondary border-transparent"
                maxLength={32}
              />
            </div>

            <DialogFooter className="pt-2 flex flex-row items-center justify-between">
              {activeExam && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setExamToDelete(activeExam)}
                  className="flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{t("common.delete")}</span>
                </Button>
              )}
              <div className="flex items-center gap-2 ms-auto">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting || !formChildId || !formName.trim()}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                  {t("common.save")}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Exam Confirmation Dialog */}
      <AlertDialog open={Boolean(examToDelete)} onOpenChange={(open) => !open && setExamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("exams.delete_modal_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("exams.delete_confirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExam}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin me-1.5" /> : null}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      </div>

      {/* Floating Add Exam Action Button (Aligned with cards) */}
      {isParent && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 max-w-3xl mx-auto w-full px-4 md:px-6">
          <div className="relative h-full w-full">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={handleOpenAddModal}
              className="pointer-events-auto absolute z-30 h-[50px] w-[50px] rounded-full bg-primary text-white flex items-center justify-center select-none shadow-md shadow-primary/30 transition-transform focus:outline-none focus-visible:outline-none ltr:end-0 rtl:start-0 md:rtl:start-auto md:end-0 bottom-[calc(max(0.625rem,env(safe-area-inset-bottom)-10px)+5.35rem)] md:bottom-8"
              title={t("exams.add_exam_button")}
              aria-label={t("exams.add_exam_button")}
            >
              <Plus className="w-[22px] h-[22px] stroke-[2.2px]" />
            </motion.button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExamsPage
