import * as React from "react"
import { useTranslation } from "react-i18next"
import { LogOut } from "lucide-react"
import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface LogoutButtonProps extends Omit<ButtonProps, "variant"> {
  onLogout?: () => void
}

export function LogoutButton({
  onLogout,
  onClick,
  children,
  className,
  type = "button",
  ...props
}: LogoutButtonProps) {
  const { t } = useTranslation()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
    if (!e.defaultPrevented) {
      onLogout?.()
    }
  }

  return (
    <Button
      type={type}
      variant="outline"
      onClick={handleClick}
      className={cn(
        "w-full sm:w-auto min-w-[200px] text-destructive hover:text-destructive hover:bg-destructive/10 flex items-center justify-center gap-2 h-10 px-6 text-sm font-semibold rounded-full border-border/80 shadow-xs hover:border-destructive/30 transition-all duration-200",
        className
      )}
      {...props}
    >
      <LogOut className="w-4 h-4 shrink-0" />
      <span>{children ?? t("auth.logout")}</span>
    </Button>
  )
}
LogoutButton.displayName = "LogoutButton"
