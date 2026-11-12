import * as React from "react"
import { useTranslation } from "react-i18next"
import { Card } from "@/components/ui/card"
import { SubjectIconBadge } from "@/components/ui/subject-icon-badge"
import { ChildBadge } from "@/components/ui/child-badge"
import { cn } from "@/lib/utils"

export interface IncidentCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  subject?: string | null
  type?: string | null
  hourNum?: number | string | null
  teacher?: string | null
  childName?: string | null
  childColorId?: string | null
  description?: string | null
}

export function IncidentCard({
  subject,
  type,
  hourNum,
  teacher,
  childName,
  childColorId,
  description,
  className,
  ...props
}: IncidentCardProps) {
  const { t } = useTranslation()

  const hasSubject = Boolean(subject?.trim())
  const subjectTitle = hasSubject ? subject! : (type || "")
  const incidentDetail = hasSubject ? (type || description) : description

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
          <SubjectIconBadge subject={subjectTitle} />

          {/* Subject Title & Lesson number stacked */}
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <span className="font-bold text-base sm:text-lg text-foreground truncate tracking-tight text-start">
              {subjectTitle}
            </span>
            {hourNum ? (
              <span className="font-normal text-xs sm:text-sm text-muted-foreground truncate text-start">
                {t("incidents.lesson_hour", { hour: hourNum })}
              </span>
            ) : null}
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

      {/* Incident Details below hairline divider */}
      {incidentDetail ? (
        <div className="text-base font-normal text-start leading-relaxed text-foreground whitespace-pre-line pt-2.5 border-t border-border/60 dark:border-border/50">
          {hasSubject && type ? (
            <>
              <span className="font-normal text-foreground">{type}</span>
              {description ? (
                <span className="font-normal me-1.5 text-foreground">:</span>
              ) : null}
              {description ? " " : null}
            </>
          ) : null}
          {description && (
            <span className="font-normal">{description}</span>
          )}
        </div>
      ) : null}
    </Card>
  )
}
