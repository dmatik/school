import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { CHILD_COLORS } from "@/lib/child-colors"

export interface ColorSwatchPickerProps {
  selectedColorId?: string | null
  onSelectColor: (colorId: string | null) => void
  allowClear?: boolean
  className?: string
  swatchSize?: "sm" | "default" | "lg"
  disabled?: boolean
}

export function ColorSwatchPicker({
  selectedColorId,
  onSelectColor,
  allowClear = true,
  className,
  swatchSize = "default",
  disabled = false
}: ColorSwatchPickerProps) {
  const { t } = useTranslation()

  const sizeClass =
    swatchSize === "sm" ? "w-5 h-5 text-[9px]" : swatchSize === "lg" ? "w-8 h-8 text-xs" : "w-6 h-6 text-[10px]"

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {allowClear && (
        <button
          type="button"
          disabled={disabled}
          title={t("account.color_default")}
          aria-label={t("account.color_default")}
          onClick={() => onSelectColor(null)}
          className={cn(
            sizeClass,
            "rounded-full border flex items-center justify-center transition-all hover:scale-110 disabled:pointer-events-none disabled:opacity-50",
            !selectedColorId
              ? "border-primary bg-primary/10 text-primary font-bold ring-2 ring-primary/30"
              : "border-border/80 bg-muted/40 text-muted-foreground"
          )}
        >
          ✕
        </button>
      )}

      {CHILD_COLORS.map((col) => {
        const isSelected = selectedColorId === col.id
        const label = t(col.labelKey)

        return (
          <button
            key={col.id}
            type="button"
            disabled={disabled}
            title={label}
            aria-label={label}
            onClick={() => onSelectColor(col.id)}
            className={cn(
              sizeClass,
              "rounded-full transition-all hover:scale-110 shadow-xs disabled:pointer-events-none disabled:opacity-50",
              col.bg,
              isSelected
                ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                : "opacity-75 hover:opacity-100"
            )}
          />
        )
      })}
    </div>
  )
}
