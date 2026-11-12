import * as React from "react"
import { cn } from "@/lib/utils"

export interface InfoItemProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode
  value?: React.ReactNode
  isLtr?: boolean
  icon?: React.ReactNode
  valueClassName?: string
}

export function InfoItem({
  label,
  value,
  isLtr,
  icon,
  className,
  valueClassName,
  children,
  ...props
}: InfoItemProps) {
  const content = value ?? children ?? "-"

  return (
    <div className={cn("space-y-1 min-w-0", className)} {...props}>
      <span className="text-xs text-muted-foreground block select-none truncate text-start">
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-semibold text-foreground block truncate text-start",
          isLtr && "tabular-nums",
          valueClassName
        )}
      >
        {icon && <span className="me-1.5 inline-flex items-center shrink-0">{icon}</span>}
        {isLtr && typeof content === "string" ? (
          <bdi dir="ltr" className="inline-block">
            {content}
          </bdi>
        ) : (
          content
        )}
      </span>
    </div>
  )
}

export interface InfoBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3 | 4
  items?: Array<InfoItemProps>
}

const columnClasses: Record<NonNullable<InfoBoxProps["columns"]>, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
}

export function InfoBox({
  columns = 2,
  items,
  className,
  children,
  ...props
}: InfoBoxProps) {
  return (
    <div
      className={cn(
        "grid gap-4 p-3.5 rounded-xl bg-muted/40 dark:bg-secondary/80 border border-transparent",
        columnClasses[columns],
        className
      )}
      {...props}
    >
      {items
        ? items.map((item, index) => <InfoItem key={index} {...item} />)
        : children}
    </div>
  )
}

export { InfoBox as InfoGrid }
