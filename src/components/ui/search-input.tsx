import * as React from "react"
import { Search, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

export interface SearchInputProps extends Omit<React.ComponentProps<"input">, "onChange"> {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  variant?: "default" | "compact"
  wrapperClassName?: string
  clearAriaLabel?: string
}

export function SearchInput({
  value,
  onChange,
  onClear,
  variant = "default",
  placeholder,
  className,
  wrapperClassName,
  clearAriaLabel,
  disabled,
  ...props
}: SearchInputProps) {
  const { t } = useTranslation()

  const handleClear = React.useCallback(() => {
    onChange("")
    onClear?.()
  }, [onChange, onClear])

  return (
    <div className={cn("relative w-full shrink-0", wrapperClassName)}>
      <Search
        className={cn(
          "absolute start-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none shrink-0",
          variant === "compact" ? "h-4 w-4" : "h-5 w-5"
        )}
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "ps-11 pe-11 rounded-full bg-black/[0.05] dark:bg-white/[0.08] border border-transparent shadow-none placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-transparent focus-visible:border-transparent transition-all",
          variant === "default" && "h-11 text-[18px]",
          variant === "compact" && "h-9 sm:h-10 text-sm",
          className
        )}
        {...props}
      />
      {Boolean(value) && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute end-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 flex items-center justify-center shrink-0"
          aria-label={clearAriaLabel || t("common.clear_search")}
        >
          <X className="w-4 h-4 stroke-[2.5px]" />
        </button>
      )}
    </div>
  )
}
