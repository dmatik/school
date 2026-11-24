import * as React from "react"
import { motion } from "framer-motion"
import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DockItem<T extends string = string> {
  tab: T
  icon: LucideIcon | React.ComponentType<{ className?: string }>
  activeIcon?: React.ComponentType<{ className?: string }>
  label: string
  badge?: React.ReactNode
}

export interface LiquidDockItemProps {
  active: boolean
  onClick: () => void
  icon: LucideIcon | React.ComponentType<{ className?: string }>
  activeIcon?: React.ComponentType<{ className?: string }>
  label: string
  isFiveOrMore?: boolean
  badge?: React.ReactNode
  layoutId?: string
  className?: string
}

export function LiquidDockItem({
  active,
  onClick,
  icon: Icon,
  activeIcon: ActiveIcon,
  label,
  isFiveOrMore,
  badge,
  layoutId = "liquidGlassPill",
  className,
}: LiquidDockItemProps) {
  const buttonRef = React.useRef<HTMLButtonElement | null>(null)

  React.useEffect(() => {
    if (active && buttonRef.current) {
      buttonRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      })
    }
  }, [active])

  const IconComponent = active && ActiveIcon ? ActiveIcon : Icon

  return (
    <motion.button
      ref={buttonRef}
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className={cn(
        "shrink-0 relative flex flex-col items-center justify-center py-2 px-0.5 rounded-full transition-colors select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        isFiveOrMore ? "w-[60px]" : "w-[77px]",
        active ? "text-primary" : "text-foreground",
        className
      )}
    >
      {active && (
        <motion.div
          layoutId={layoutId}
          transition={{
            type: "spring",
            stiffness: 450,
            damping: 35,
          }}
          className="absolute inset-y-0 -inset-x-2 rounded-full apple-liquid-pill"
        />
      )}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <div className="relative">
          <IconComponent
            className={cn(
              "stroke-[2px] w-[22px] h-[22px] transition-all",
              active ? "dock-icon-full text-primary" : "fill-none"
            )}
          />
          {badge && (
            <div className="absolute -top-1 -end-1">
              {badge}
            </div>
          )}
        </div>
          <span
            className={cn(
              "text-[10px] leading-none mt-0.5 truncate font-medium transition-colors",
              isFiveOrMore ? "max-w-[58px]" : "max-w-[73px]",
              active ? "text-primary font-semibold" : "text-foreground"
            )}
          >
          {label}
        </span>
      </div>
    </motion.button>
  )
}

export interface LiquidDockProps<T extends string = string>
  extends React.HTMLAttributes<HTMLElement> {
  items: DockItem<T>[]
  activeTab: T
  onTabChange: (tab: T) => void
  layoutId?: string
  floating?: boolean
}

export function LiquidDock<T extends string = string>({
  items,
  activeTab,
  onTabChange,
  layoutId = "liquidGlassPill",
  floating = true,
  className,
  ...props
}: LiquidDockProps<T>) {
  const isFiveOrMore = items.length >= 5
  const isScrollable = items.length > 5

  return (
    <nav
      aria-label="Mobile Navigation"
      className={cn(
        floating && "md:hidden fixed bottom-[max(1.125rem,calc(env(safe-area-inset-bottom)-2px))] inset-x-0 mx-auto z-30",
        "p-1 rounded-full apple-liquid-dock transition-all duration-300",
        isScrollable
          ? "w-[min(356px,calc(100vw-1.5rem))] overflow-x-auto no-scrollbar"
          : "w-fit max-w-[calc(100vw-1.5rem)]",
        className
      )}
      {...props}
    >
      <div className={cn("flex items-center relative gap-2 px-2", isFiveOrMore && "w-max")}>
        {items.map((item) => (
          <LiquidDockItem
            key={item.tab}
            active={activeTab === item.tab}
            onClick={() => onTabChange(item.tab)}
            icon={item.icon}
            activeIcon={item.activeIcon}
            label={item.label}
            badge={item.badge}
            isFiveOrMore={isFiveOrMore}
            layoutId={layoutId}
          />
        ))}
      </div>
    </nav>
  )
}
