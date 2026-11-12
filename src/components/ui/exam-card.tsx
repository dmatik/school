import * as React from "react"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { EditButton } from "@/components/ui/action-button"
import { SubjectIconBadge } from "@/components/ui/subject-icon-badge"
import { ChildBadge } from "@/components/ui/child-badge"
import { cn, parseLocalDate } from "@/lib/utils"

export interface ExamCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  name: string
  subject?: string | null
  date?: string | Date | null
  grade?: string | number | null
  childName?: string | null
  childColorId?: string | null
  description?: string | null
  onEdit?: () => void
}

export function ExamCard({
  name,
  subject,
  date,
  grade,
  childName,
  childColorId,
  description,
  onEdit,
  className,
  ...props
}: ExamCardProps) {
  const { t } = useTranslation()

  const dateStr = React.useMemo(() => {
    if (!date) return null
    try {
      const d = typeof date === "string" ? parseLocalDate(date) : date
      return format(d, "dd/MM/yyyy")
    } catch {
      return String(date)
    }
  }, [date])

  return (
    <Card
      className={cn(
        "relative overflow-hidden shadow-xs border border-border/40 dark:border-border/60 hover:shadow-sm transition-all duration-200 flex flex-col p-3.5 sm:p-4 gap-2.5 rounded-2xl bg-card",
        className
      )}
      {...props}
    >
      {/* Top Row: Subject Icon + Title & Subtitle (Start), Child Badge & Actions (End) */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <SubjectIconBadge subject={subject || name} />

          {/* Exam Name, Date, and Grade */}
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <span className="font-bold text-base sm:text-lg text-foreground truncate tracking-tight text-start">
              {name}
            </span>

            {(dateStr || grade) && (
              <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm text-muted-foreground font-medium text-start mt-0.5">
                {dateStr && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0 -translate-y-[1px]" />
                    <span className="leading-none">{dateStr}</span>
                  </span>
                )}

                {grade ? (
                  <StatusBadge
                    variant="grade"
                    label={t("exams.grade_badge", { grade })}
                  />
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Top-End actions: Student Name badge & Edit button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {childName && (
            <ChildBadge name={childName} colorId={childColorId} className="mt-0.5" />
          )}

          {onEdit && (
            <EditButton
              size="icon"
              onClick={onEdit}
              className="h-8 w-8 rounded-full"
              title={t("exams.edit_exam_button")}
              aria-label={t("exams.edit_exam_button")}
            />
          )}
        </div>
      </div>

      {/* Description below date: unboxed, separated by hairline divider */}
      {description && (
        <div className="text-base font-normal text-start leading-relaxed text-foreground whitespace-pre-line pt-2.5 border-t border-border/60 dark:border-border/50">
          {description}
        </div>
      )}
    </Card>
  )
}
