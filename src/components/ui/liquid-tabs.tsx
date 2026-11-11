import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export interface LiquidTabItem<T extends string = string> {
  id: T
  label: React.ReactNode
  title?: string
}

export interface LiquidTabsProps<T extends string = string>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  items: LiquidTabItem<T>[]
  selectedId: T
  onSelect: (id: T) => void
  layoutId?: string
  ariaLabel?: string
  className?: string
  tabClassName?: string
  maxItemWidth?: string
  size?: "default" | "sm"
}

export function LiquidTabs<T extends string = string>({
  items,
  selectedId,
  onSelect,
  layoutId = "liquidPillSelection",
  ariaLabel,
  className,
  tabClassName,
  maxItemWidth = "max-w-[140px]",
  size = "default",
  ...props
}: LiquidTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center p-1 rounded-full apple-liquid-dock overflow-x-auto no-scrollbar max-w-full shrink-0 select-none",
        size === "sm" ? "h-8.5" : "h-10",
        className
      )}
      {...props}
    >
      {items.map((item) => {
        const isActive = selectedId === item.id

        return (
          <motion.button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(item.id)}
            title={item.title || (typeof item.label === "string" ? item.label : undefined)}
            className={cn(
              "relative flex items-center justify-center rounded-full font-medium transition-colors select-none shrink-0 focus:outline-none focus-visible:outline-none",
              size === "sm" ? "h-6.5 px-3 text-sm" : "h-8 px-4 text-base",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
              tabClassName
            )}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                transition={{
                  type: "spring",
                  stiffness: 450,
                  damping: 35
                }}
                className="absolute inset-0 rounded-full apple-liquid-pill"
              />
            )}
            <span className={cn("relative z-10 truncate", maxItemWidth)}>
              {item.label}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
