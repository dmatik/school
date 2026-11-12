import * as React from "react"
import { type LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface SectionCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: LucideIcon | React.ComponentType<{ className?: string }> | React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  headerClassName?: string
  contentClassName?: string
}

function renderIcon(icon: SectionCardProps["icon"]) {
  if (!icon) return null
  if (React.isValidElement(icon)) return icon
  const IconComponent = icon as React.ComponentType<{ className?: string }>
  return <IconComponent className="w-5 h-5" />
}

export function SectionCard({
  icon,
  title,
  description,
  action,
  headerClassName,
  contentClassName,
  className,
  children,
  ...props
}: SectionCardProps) {
  const hasHeader = Boolean(title || icon || action || description)

  return (
    <Card
      className={cn(
        "relative overflow-hidden shadow-xs border border-border/40 dark:border-border/60 hover:shadow-sm transition-all duration-200 rounded-2xl bg-card",
        className
      )}
      {...props}
    >
      {hasHeader && (
        <div
          className={cn(
            "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5 border-b border-border/40 dark:border-border/60",
            headerClassName
          )}
        >
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2.5">
              {icon && (
                <span className="text-primary shrink-0 flex items-center justify-center">
                  {renderIcon(icon)}
                </span>
              )}
              {title && (
                <h3 className="font-bold text-base sm:text-lg text-foreground tracking-tight">
                  {title}
                </h3>
              )}
            </div>
            {description && (
              <p className="text-xs sm:text-sm text-muted-foreground font-normal">
                {description}
              </p>
            )}
          </div>
          {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
        </div>
      )}

      {children && (
        hasHeader ? (
          <div className={cn("p-4 sm:p-5", contentClassName)}>
            {children}
          </div>
        ) : (
          children
        )
      )}
    </Card>
  )
}

export const SectionCardHeader = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5 border-b border-border/40 dark:border-border/60",
      className
    )}
    {...props}
  >
    {children}
  </div>
)

export const SectionCardTitle = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn(
      "font-bold text-base sm:text-lg text-foreground tracking-tight flex items-center gap-2.5",
      className
    )}
    {...props}
  >
    {children}
  </h3>
)

export const SectionCardDescription = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    className={cn("text-xs sm:text-sm text-muted-foreground font-normal", className)}
    {...props}
  >
    {children}
  </p>
)

export const SectionCardContent = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-4 sm:p-5", className)} {...props}>
    {children}
  </div>
)
