import * as React from "react"
import { CheckCircle2, Globe, Award, Shield, Users, Baby, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type StatusBadgeVariant =
  | "success"
  | "neutral"
  | "grade"
  | "admin"
  | "user"
  | "parent"
  | "child"
  | "custom"

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusBadgeVariant
  label: React.ReactNode
  icon?: LucideIcon | React.ComponentType<{ className?: string }>
}

export function StatusBadge({
  variant = "neutral",
  label,
  icon: CustomIcon,
  className,
  ...props
}: StatusBadgeProps) {
  let defaultIcon: LucideIcon | React.ComponentType<{ className?: string }> | null = null
  let styleClasses = ""

  switch (variant) {
    case "success":
      defaultIcon = CheckCircle2
      styleClasses = "bg-[#2CA58D]/15 text-[#2CA58D] dark:bg-[#2CA58D]/25 dark:text-[#9EE8D8]"
      break
    case "neutral":
      defaultIcon = Globe
      styleClasses = "bg-muted text-muted-foreground"
      break
    case "grade":
      defaultIcon = Award
      styleClasses = "bg-[#555DB0]/15 text-[#555DB0] dark:bg-[#555DB0]/25 dark:text-[#C5C8F5] font-bold"
      break
    case "admin":
      defaultIcon = Shield
      styleClasses = "bg-[#D4973B]/15 text-[#D4973B] dark:bg-[#D4973B]/25 dark:text-[#F5D59E]"
      break
    case "user":
      defaultIcon = Shield
      styleClasses = "bg-[#3B82C4]/15 text-[#3B82C4] dark:bg-[#3B82C4]/25 dark:text-[#AED4F8]"
      break
    case "parent":
      defaultIcon = Users
      styleClasses = "bg-[#8A63B8]/15 text-[#8A63B8] dark:bg-[#8A63B8]/25 dark:text-[#D8C2F2]"
      break
    case "child":
      defaultIcon = Baby
      styleClasses = "bg-[#2CA58D]/15 text-[#2CA58D] dark:bg-[#2CA58D]/25 dark:text-[#9EE8D8]"
      break
    case "custom":
    default:
      styleClasses = "bg-muted text-foreground"
      break
  }

  const IconComponent = CustomIcon !== undefined ? CustomIcon : defaultIcon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-transparent shrink-0 shadow-xs transition-colors",
        styleClasses,
        className
      )}
      {...props}
    >
      {IconComponent && <IconComponent className="w-3.5 h-3.5 shrink-0" />}
      <span className="truncate">{label}</span>
    </span>
  )
}
