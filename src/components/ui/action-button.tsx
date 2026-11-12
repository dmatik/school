import * as React from "react"
import { useTranslation } from "react-i18next"
import { Edit2, Trash2, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ActionButtonVariant = "ghost" | "muted" | "destructive" | "outline" | "default"

export interface ActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon | React.ComponentType<{ className?: string }>
  iconPosition?: "start" | "end"
  variant?: ActionButtonVariant
  size?: "default" | "sm" | "lg" | "icon"
  children?: React.ReactNode
}

export function ActionButton({
  icon: Icon,
  iconPosition = "end",
  variant = "muted",
  size = "sm",
  children,
  className,
  type = "button",
  ...props
}: ActionButtonProps) {
  let variantClass = "text-muted-foreground hover:text-foreground"
  let buttonVariant: "ghost" | "outline" | "default" | "destructive" = "ghost"

  switch (variant) {
    case "destructive":
      variantClass = "text-destructive hover:text-destructive"
      buttonVariant = "ghost"
      break
    case "muted":
      variantClass = "text-muted-foreground hover:text-foreground"
      buttonVariant = "ghost"
      break
    case "outline":
      variantClass = ""
      buttonVariant = "outline"
      break
    case "default":
      variantClass = ""
      buttonVariant = "default"
      break
    case "ghost":
    default:
      variantClass = ""
      buttonVariant = "ghost"
      break
  }

  const iconEl = Icon ? (
    <Icon className="w-3.5 h-3.5 shrink-0" />
  ) : null

  return (
    <Button
      type={type}
      variant={buttonVariant}
      size={size}
      className={cn(
        "text-xs flex items-center gap-1.5 transition-colors font-medium",
        variantClass,
        className
      )}
      {...props}
    >
      {iconPosition === "start" ? (
        <>
          {iconEl}
          {children && <span>{children}</span>}
        </>
      ) : (
        <>
          {children && <span>{children}</span>}
          {iconEl}
        </>
      )}
    </Button>
  )
}

export function EditButton({
  children,
  icon = Edit2,
  ...props
}: ActionButtonProps) {
  const { t } = useTranslation()
  return (
    <ActionButton
      variant="muted"
      icon={icon}
      {...props}
    >
      {children ?? t("common.edit")}
    </ActionButton>
  )
}

export function DestructiveButton({
  children,
  icon = Trash2,
  ...props
}: ActionButtonProps) {
  return (
    <ActionButton
      variant="destructive"
      icon={icon}
      {...props}
    >
      {children}
    </ActionButton>
  )
}
