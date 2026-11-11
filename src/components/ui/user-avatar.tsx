import * as React from "react"
import { User, Camera, Upload, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface UserAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  avatarUrl?: string | null
  name?: string
  size?: "sm" | "md" | "lg" | "xl"
  colorClassName?: string
  editable?: boolean
  onAvatarChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onAvatarRemove?: () => void
  activeRing?: boolean
}

export function UserAvatar({
  avatarUrl,
  name = "User",
  size = "md",
  colorClassName,
  editable = false,
  onAvatarChange,
  onAvatarRemove,
  activeRing = false,
  className,
  ...props
}: UserAvatarProps) {
  const { t } = useTranslation()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: "w-9 h-9 text-sm",
    md: "w-10 h-10 text-base font-bold",
    lg: "w-14 h-14 text-xl font-bold",
    xl: "w-24 h-24 text-3xl font-bold",
  }[size]

  const initial = name ? name[0]?.toUpperCase() : "U"

  const avatarDisplay = (
    <div
      className={cn(
        "relative rounded-full shrink-0 select-none",
        editable && "group cursor-pointer",
        activeRing && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        className
      )}
      onClick={editable ? () => fileInputRef.current?.click() : undefined}
      {...props}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className={cn("rounded-full object-cover border border-transparent shadow-xs", sizeClasses)}
        />
      ) : (
        <div
          className={cn(
            "rounded-full flex items-center justify-center border border-transparent shadow-xs",
            colorClassName || "bg-primary text-primary-foreground",
            sizeClasses
          )}
        >
          {initial || <User className="w-1/2 h-1/2" />}
        </div>
      )}

      {editable && (
        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
          <Camera className="w-6 h-6" />
        </div>
      )}
    </div>
  )

  if (!editable) {
    return avatarDisplay
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      {avatarDisplay}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={onAvatarChange}
      />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs"
        >
          <Upload className="w-3.5 h-3.5 me-1" />
          {t("account.change_photo")}
        </Button>
        {Boolean(avatarUrl) && onAvatarRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onAvatarRemove}
            className="text-xs text-destructive hover:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5 me-1" />
            {t("account.remove_photo")}
          </Button>
        )}
      </div>
    </div>
  )
}
