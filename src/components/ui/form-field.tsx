import * as React from "react"
import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input, type InputProps } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export interface FilledInputProps extends InputProps {
  variant?: "card" | "filled"
}

export function FilledInput({
  variant = "filled",
  className,
  ...props
}: FilledInputProps) {
  return (
    <Input
      className={cn(
        variant === "filled" && "bg-muted dark:bg-secondary border-transparent",
        className
      )}
      {...props}
    />
  )
}

export interface IconInputProps extends InputProps {
  icon: LucideIcon | React.ComponentType<{ className?: string }>
  variant?: "card" | "filled"
  wrapperClassName?: string
}

export function IconInput({
  icon: Icon,
  variant = "filled",
  className,
  wrapperClassName,
  ...props
}: IconInputProps) {
  return (
    <div className={cn("relative w-full", wrapperClassName)}>
      <Icon className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        className={cn(
          "ps-9 h-9 text-sm rounded-full border-transparent",
          variant === "filled" && "bg-muted dark:bg-secondary",
          className
        )}
        {...props}
      />
    </div>
  )
}

export interface CounterFieldProps {
  label: React.ReactNode
  htmlFor?: string
  currentLength: number
  maxLength: number
  children: React.ReactNode
  className?: string
}

export function CounterField({
  label,
  htmlFor,
  currentLength,
  maxLength,
  children,
  className
}: CounterFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={htmlFor}>{label}</Label>
        <span className="text-xs text-muted-foreground tabular-nums">
          {currentLength}/{maxLength}
        </span>
      </div>
      {children}
    </div>
  )
}

export interface ReadOnlyPillFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode
  value: React.ReactNode
  icon?: LucideIcon | React.ComponentType<{ className?: string }>
}

export function ReadOnlyPillField({
  label,
  value,
  icon: Icon,
  className,
  ...props
}: ReadOnlyPillFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-semibold bg-muted/40 border border-transparent text-foreground shadow-xs truncate">
        {Icon && <Icon className="w-4 h-4 shrink-0 text-primary" />}
        <span className="truncate">{value}</span>
      </div>
    </div>
  )
}

export interface TimePresetInputProps {
  value: string
  onChange: (value: string) => void
  presets?: string[]
  presetsLabel?: string
  id?: string
  className?: string
  disabled?: boolean
}

export function TimePresetInput({
  value,
  onChange,
  presets = ["11:45", "12:45", "13:30", "14:15", "15:00", "16:00"],
  presetsLabel,
  id = "time-preset-input",
  className,
  disabled
}: TimePresetInputProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (raw.length < value.length && value.startsWith(raw)) {
      onChange(raw.endsWith(":") ? raw.slice(0, -1) : raw)
      return
    }
    if (/^\d:$/.test(raw)) {
      onChange(`0${raw}`)
      return
    }
    const digits = raw.replace(/\D/g, "").slice(0, 4)
    if (digits.length <= 2) {
      onChange(digits)
    } else {
      onChange(`${digits.slice(0, 2)}:${digits.slice(2)}`)
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="13:30"
        maxLength={5}
        value={value}
        onChange={handleInputChange}
        disabled={disabled}
        className="bg-muted dark:bg-secondary border-transparent font-bold tabular-nums text-start h-9"
      />
      {presets.length > 0 && (
        <div className="space-y-1.5">
          {presetsLabel && (
            <span className="text-xs text-muted-foreground block font-medium">
              {presetsLabel}
            </span>
          )}
          <div className="grid grid-cols-3 gap-1.5">
            {presets.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant={value === preset ? "default" : "outline"}
                size="sm"
                disabled={disabled}
                onClick={() => onChange(preset)}
                className="h-8 text-xs font-semibold tabular-nums"
              >
                {preset}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
