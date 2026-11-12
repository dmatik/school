import * as React from "react"
import { useTranslation } from "react-i18next"
import { Card } from "@/components/ui/card"
import { SubjectIconBadge } from "@/components/ui/subject-icon-badge"
import { ChildBadge } from "@/components/ui/child-badge"
import { cn } from "@/lib/utils"

export interface HomeworkCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  subject: string
  lessonHour?: number | string | null
  lessonHours?: (number | string)[] | null
  teacher?: string | null
  childName?: string | null
  childColorId?: string | null
  homeworkText?: string | null
  prefix?: string
}

export function HomeworkCard({
  subject,
  lessonHour,
  lessonHours,
  teacher,
  childName,
  childColorId,
  homeworkText,
  prefix,
  className,
  ...props
}: HomeworkCardProps) {
  const { t } = useTranslation()

  const subtitle = React.useMemo(() => {
    if (lessonHours && lessonHours.length > 1) {
      return t("homework.lesson_hours", { hours: lessonHours.join(", ") })
    }
    if ((lessonHours && lessonHours.length === 1) || lessonHour) {
      return t("homework.lesson_hour", {
        hour: (lessonHours && lessonHours[0]) ?? lessonHour,
      })
    }
    return null
  }, [lessonHour, lessonHours, t])

  const homeworkPrefix = prefix ?? t("homework.homework_prefix")

  return (
    <Card
      className={cn(
        "relative overflow-hidden shadow-xs border border-border/40 dark:border-border/60 hover:shadow-sm transition-all duration-200 flex flex-col p-3.5 sm:p-4 gap-2.5 rounded-2xl bg-card",
        className
      )}
      {...props}
    >
      {/* Top Row: Subject Icon + Title & Lesson (Start), Child Name badge (End) */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <SubjectIconBadge subject={subject} />

          {/* Subject Title & Lesson number stacked */}
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <span className="font-bold text-base sm:text-lg text-foreground truncate tracking-tight text-start">
              {subject}
            </span>
            {subtitle && (
              <span className="font-normal text-xs sm:text-sm text-muted-foreground truncate text-start">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {childName && (
          <ChildBadge name={childName} colorId={childColorId} className="mt-0.5" />
        )}
      </div>

      {/* Teacher Name */}
      {teacher && (
        <div className="text-sm text-muted-foreground font-medium text-start truncate">
          {teacher}
        </div>
      )}

      {/* Homework Details */}
      {homeworkText && (
        <div className="text-base font-normal text-start leading-relaxed text-foreground whitespace-pre-line pt-2.5 border-t border-border/60 dark:border-border/50">
          <span className="me-1.5">{homeworkPrefix}</span>
          <span className="font-normal">{homeworkText}</span>
        </div>
      )}
    </Card>
  )
}
