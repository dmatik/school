import * as React from "react"
import { cn } from "@/lib/utils"

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  sticky?: boolean
  border?: boolean
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  sticky = true,
  border = true,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      data-page-title
      className={cn(
        "hidden md:flex items-center justify-between gap-3 pb-2 shrink-0",
        sticky && "md:sticky md:top-0 md:z-30 md:bg-background md:pt-6",
        border && "border-b border-border/70 dark:border-border/60",
        className
      )}
      {...props}
    >
      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-bold tracking-tight text-foreground truncate">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
