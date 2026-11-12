import * as React from "react"
import { AlertCircle, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface NoticeBannerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode
  description?: React.ReactNode
  badge?: React.ReactNode
  icon?: LucideIcon | React.ComponentType<{ className?: string }> | null
  variant?: "info" | "warning" | "destructive"
}

export function NoticeBanner({
  title,
  description,
  badge,
  icon: Icon = AlertCircle,
  variant = "info",
  className,
  children,
  ...props
}: NoticeBannerProps) {
  const variantStyles = {
    info: {
      container: "bg-muted/60 border-border text-foreground",
      iconBox: "bg-primary/10 text-primary",
    },
    warning: {
      container: "bg-[#D4973B]/10 border-[#D4973B]/30 text-foreground",
      iconBox: "bg-[#D4973B]/15 text-[#D4973B] dark:text-[#F5D59E]",
    },
    destructive: {
      container: "bg-destructive/10 border-destructive/20 text-destructive",
      iconBox: "bg-destructive/15 text-destructive",
    },
  }[variant]

  return (
    <div
      className={cn(
        "rounded-xl p-4 border flex items-start gap-3",
        variantStyles.container,
        className
      )}
      {...props}
    >
      {Icon && (
        <div className={cn("p-1.5 rounded-lg mt-0.5 shrink-0", variantStyles.iconBox)}>
          <Icon className="w-4 h-4" />
        </div>
      )}
      <div className="space-y-1 text-start flex-1 min-w-0">
        {(title || badge) && (
          <div className="flex items-center gap-2 flex-wrap">
            {title && <span className="text-xs font-semibold text-foreground">{title}</span>}
            {badge && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#3B82C4]/15 text-[#3B82C4] dark:bg-[#3B82C4]/25 dark:text-[#AED4F8] border border-transparent">
                {badge}
              </span>
            )}
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        )}
        {children}
      </div>
    </div>
  )
}
NoticeBanner.displayName = "NoticeBanner"
