import type { ReactNode, HTMLAttributes } from "react"
import { Card } from "@/components/ui/card"
import { SubjectIconBadge } from "@/components/ui/subject-icon-badge"
import { ChildBadge } from "@/components/ui/child-badge"
import { cn } from "@/lib/utils"

export interface FeedItemCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title" | "content"> {
  subject?: string | null
  title: string
  subtitle?: ReactNode
  metaLine?: ReactNode
  teacher?: ReactNode
  childName?: string | null
  childColorId?: string | null
  actions?: ReactNode
  content?: ReactNode
  customBadge?: ReactNode
}

export function FeedItemCard({
  subject,
  title,
  subtitle,
  metaLine,
  teacher,
  childName,
  childColorId,
  actions,
  content,
  customBadge,
  className,
  ...props
}: FeedItemCardProps) {
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
          <SubjectIconBadge subject={subject || title} />

          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <span className="font-bold text-base sm:text-lg text-foreground truncate tracking-tight text-start">
              {title}
            </span>
            {subtitle && (
              <div className="font-normal text-xs sm:text-sm text-muted-foreground truncate text-start">
                {subtitle}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {customBadge}
          {childName && !customBadge && (
            <ChildBadge name={childName} colorId={childColorId} className="mt-0.5" />
          )}
          {actions}
        </div>
      </div>

      {/* Meta info (e.g. Teacher, Date, etc.) */}
      {(teacher || metaLine) && (
        <div className="text-sm text-muted-foreground font-medium text-start truncate">
          {teacher || metaLine}
        </div>
      )}

      {/* Detail / Description below hairline divider */}
      {content && (
        <div className="text-base font-normal text-start leading-relaxed text-foreground whitespace-pre-line pt-2.5 border-t border-border/60 dark:border-border/50">
          {content}
        </div>
      )}
    </Card>
  )
}
