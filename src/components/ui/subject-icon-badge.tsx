import * as React from "react"
import { cn } from "@/lib/utils"
import { getSubjectConfig } from "@/lib/subject-icons"

export interface SubjectIconBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  subject?: string | null
  variant?: "solid" | "soft"
  size?: "sm" | "default" | "lg"
}

export function SubjectIconBadge({
  subject,
  variant = "solid",
  size = "default",
  className,
  ...props
}: SubjectIconBadgeProps) {
  const config = getSubjectConfig(subject)
  const Icon = config.icon
  const colorClass = variant === "solid" ? config.solidBadgeClass : config.badgeClass

  return (
    <div
      className={cn(
        "border flex items-center justify-center shrink-0 select-none transition-colors",
        size === "sm" && "w-8 h-8 rounded-lg",
        size === "default" && "w-11 h-11 rounded-[14px]",
        size === "lg" && "w-14 h-14 rounded-2xl",
        colorClass,
        className
      )}
      {...props}
    >
      <Icon
        className={cn(
          "shrink-0",
          size === "sm" && "w-4 h-4 stroke-[2]",
          size === "default" && "w-5 h-5 stroke-[2.25]",
          size === "lg" && "w-7 h-7 stroke-[2.25]"
        )}
      />
    </div>
  )
}
