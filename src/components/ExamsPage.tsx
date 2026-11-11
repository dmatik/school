import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { motion } from "framer-motion"
import { PageHeader } from "@/components/ui/page-header"
import { LiquidTabs, type LiquidTabItem } from "@/components/ui/liquid-tabs"
import { SearchInput } from "@/components/ui/search-input"
import {
  Plus,
  Trash2,
  Loader2,
  GraduationCap
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
import { format } from "date-fns"
import { DatePicker } from "@/components/ui/date-picker"
import { SectionDateHeader } from "@/components/ui/section-date-header"
import { ExamCard } from "@/components/ui/exam-card"
import { parseLocalDate, getChildFirstName } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import type { ExamItem, WebtopConfig, User as UserType } from "@/types"

interface ExamsPageProps {
  token?: string | null
  syncTrigger?: number
  currentUser?: UserType | null
}

type PeriodFilter = "future" | "past"

export function ExamsPage({ token, syncTrigger, currentUser }: ExamsPageProps) {
  const { t } = useTranslation()
  const isChild = currentUser?.familyRole === "child"
  const isParent = !isChild

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

  const hasChildFilter = !isChild && Boolean(webtopConfig?.linkedChildren && webtopConfig.linkedChildren.length > 0)

  const childTabItems = useMemo(() => [
    { id: "all", label: t("exams.all_short") },
    ...(webtopConfig?.linkedChildren.map((c) => ({
      id: c.id,
      label: c.firstName?.trim() || c.lastName?.trim() || ""
    })) || [])
  ], [webtopConfig?.linkedChildren, t])

  const periodTabItems = useMemo<LiquidTabItem<PeriodFilter>[]>(() => [
    { id: "future", label: t("exams.period_future") },
    { id: "past", label: t("exams.period_past") }
  ], [t])

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="h-full flex flex-col pt-[3.75rem] pb-[calc(max(0.625rem,env(safe-area-inset-bottom)-10px)+10rem)] px-4 md:pt-0 md:pb-28 md:px-6 overflow-y-auto gap-4 md:gap-6 max-w-3xl mx-auto w-full">
        {/* Page Header with Title (Desktop only) */}
        <PageHeader title={t("exams.title")} />

      {/* Filter Area: Search, Child Selector & Period Selector (Future vs Past) */}
      {/* Search Input */}
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={t("exams.search_placeholder")}
        wrapperClassName="-mb-1.5 md:-mb-3.5"
      />

      {/* Liquid Glass Filter Row: Child selector at beginning of row, Period selector at end of row */}
      <div
        data-sticky-filters
        className="sticky top-0 md:top-[61px] z-20 flex items-center justify-between gap-2 pt-0.5 pb-0.5 shrink-0"
      >
        {/* 1 - Children Liquid Glass Selector (Parents only) */}
        {hasChildFilter && (
          <LiquidTabs
            data-exams-child-selector
            aria-label={t("exams.filter_child")}
            items={childTabItems}
            selectedId={selectedChildId}
            onSelect={setSelectedChildId}
            layoutId="examsChildLiquidPill"
          />
        )}

        {/* 2 - Future / Past Liquid Glass Selector (at the end of the row) */}
        <LiquidTabs<PeriodFilter>
          data-exams-period-selector
          aria-label={t("exams.filter_period")}
          items={periodTabItems}
          selectedId={selectedPeriod}
          onSelect={setSelectedPeriod}
          layoutId="examsPeriodLiquidPill"
          className="ms-auto shrink-0"
        />
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : isChild && !currentUser?.linkedChildId ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
          <Card className="w-full max-w-md border-dashed border-2 shadow-sm text-center p-8 bg-card/40">
            <div className="w-12 h-12 rounded-full bg-[#D4973B]/15 text-[#D4973B] dark:bg-[#D4973B]/25 dark:text-[#F5D59E] flex items-center justify-center mx-auto mb-3">
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
            <div className="w-12 h-12 rounded-full bg-[#555DB0]/15 text-[#555DB0] dark:bg-[#555DB0]/25 dark:text-[#C5C8F5] flex items-center justify-center mx-auto mb-3">
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
        <div className="space-y-3.5 !mt-0">
          {groupedExams.map((group) => (
            <div key={group.date} className="space-y-1">
              {/* Date Section Header */}
              <SectionDateHeader date={group.date} />

              {/* Feed Cards */}
              <div className="flex flex-col gap-2.5 sm:gap-3">
                {group.items.map((exam) => {
                  const matchedChild = webtopConfig?.linkedChildren?.find(
                    (c) =>
                      (exam.childId && (c.id === exam.childId || c.externalId === exam.childId)) ||
                      (exam.studentName && `${c.firstName} ${c.lastName}`.trim() === exam.studentName.trim())
                  )
                  const childDisplayName = getChildFirstName(exam.studentName, matchedChild) || exam.studentName

                  return (
                    <ExamCard
                      key={exam.id}
                      name={exam.name}
                      date={exam.date}
                      grade={exam.grade}
                      childName={!isChild ? childDisplayName : null}
                      childColorId={!isChild ? matchedChild?.color : null}
                      description={exam.description}
                      onEdit={isParent ? () => handleOpenEditModal(exam) : undefined}
                    />
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
                <p className="text-xs text-[#D4973B] dark:text-[#F5D59E]">
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
                <p className="text-xs text-[#D4973B] dark:text-[#F5D59E]">
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
