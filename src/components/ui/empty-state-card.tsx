import type { ReactNode, ComponentType, HTMLAttributes } from "react"
import { type LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface EmptyStateCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  icon: LucideIcon | ComponentType<{ className?: string }>
  title: ReactNode
  description?: ReactNode
  iconClassName?: string
  actions?: ReactNode
  onboardingNotice?: ReactNode
  variant?: "simple" | "onboarding"
}

export function EmptyStateCard({
  icon: Icon,
  title,
  description,
  iconClassName = "bg-[#2CA58D]/15 text-[#2CA58D] dark:bg-[#2CA58D]/25 dark:text-[#9EE8D8]",
  actions,
  onboardingNotice,
  variant = "simple",
  className,
  ...props
}: EmptyStateCardProps) {
  if (variant === "onboarding") {
    return (
      <Card className={cn("w-full max-w-xl border-dashed border-2 shadow-sm bg-card/60", className)} {...props}>
        <CardHeader className="text-center pb-4">
          <div className={cn("mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner", iconClassName)}>
            <Icon className="w-7 h-7" />
          </div>
          <CardTitle className="text-xl font-bold">{title}</CardTitle>
          {description && (
            <CardDescription className="text-sm max-w-md mx-auto pt-1">
              {description}
            </CardDescription>
          )}
        </CardHeader>
        {onboardingNotice && <CardContent className="pt-2">{onboardingNotice}</CardContent>}
        {actions && <div className="p-6 pt-0 flex justify-center">{actions}</div>}
      </Card>
    )
  }

  return (
    <Card className={cn("w-full max-w-md border-dashed border-2 shadow-sm text-center p-8 bg-card/40 mx-auto", className)} {...props}>
      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3", iconClassName)}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-semibold text-base text-foreground">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {actions && <div className="mt-4 flex items-center justify-center gap-2">{actions}</div>}
    </Card>
  )
}
