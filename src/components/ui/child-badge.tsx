import * as React from "react"
import { cn } from "@/lib/utils"
import { getChildBadgeClasses, getChildAccentColor } from "@/lib/child-colors"

export interface ChildBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string
  colorId?: string | null
  variant?: "dot" | "solid"
  size?: "default" | "sm"
  maxTruncateWidth?: string
}

export function ChildBadge({
  name,
  colorId,
  variant = "dot",
  size = "default",
  maxTruncateWidth = "max-w-[120px] sm:max-w-none",
  className,
  ...props
}: ChildBadgeProps) {
  const badgeClasses = getChildBadgeClasses(colorId)
  const accentClass = getChildAccentColor(colorId)

  return (
    <span
      className={cn(
        "inline-flex items-center border border-transparent shrink-0 shadow-xs transition-colors rounded-full font-semibold",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        variant === "dot" ? "gap-1.5" : "gap-1",
        badgeClasses,
        className
      )}
      {...props}
    >
      {variant === "dot" && (
        <span className={cn("w-2 h-2 rounded-full shrink-0", accentClass)} />
      )}
      <span className={cn("truncate", maxTruncateWidth)}>{name}</span>
    </span>
  )
}
