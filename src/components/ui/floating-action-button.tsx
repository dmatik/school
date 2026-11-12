import * as React from "react"
import { motion } from "framer-motion"
import { Plus, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FloatingActionButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  icon?: LucideIcon | React.ComponentType<{ className?: string }>
  activeIcon?: LucideIcon | React.ComponentType<{ className?: string }>
  active?: boolean
  colorClassName?: string
  title?: string
  ariaLabel?: string
  asFixedOverlay?: boolean
}

export function FloatingActionButton({
  onClick,
  icon: Icon = Plus,
  activeIcon: ActiveIcon,
  active = false,
  colorClassName,
  title,
  ariaLabel,
  className,
  asFixedOverlay = true,
  disabled,
  ...props
}: FloatingActionButtonProps) {
  const IconComponent = active && ActiveIcon ? ActiveIcon : Icon

  const button = (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "pointer-events-auto h-[50px] w-[50px] rounded-full flex items-center justify-center select-none shadow-md transition-transform focus:outline-none focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none",
        colorClassName || "bg-primary text-primary-foreground shadow-primary/30",
        asFixedOverlay && "absolute z-30 ltr:end-0 rtl:start-0 md:rtl:start-auto md:end-0 bottom-[calc(max(0.625rem,env(safe-area-inset-bottom)-10px)+5.35rem)] md:bottom-8",
        className
      )}
      title={title || ariaLabel}
      aria-label={ariaLabel || title}
      {...(props as any)}
    >
      <IconComponent className="w-[22px] h-[22px] stroke-[2.2px] shrink-0" />
    </motion.button>
  )

  if (!asFixedOverlay) {
    return button
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 max-w-3xl mx-auto w-full px-4 md:px-6">
      <div className="relative h-full w-full">
        {button}
      </div>
    </div>
  )
}
