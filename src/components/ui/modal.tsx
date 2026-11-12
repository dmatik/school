import * as React from "react"
import { useTranslation } from "react-i18next"
import { type LucideIcon, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

export interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  icon?: LucideIcon | React.ComponentType<{ className?: string }> | React.ReactNode
  maxWidth?: "sm" | "md" | "lg"
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
  footer?: React.ReactNode
  onOpenAutoFocus?: (event: Event) => void
  className?: string
  contentClassName?: string
  children: React.ReactNode
}

function renderModalIcon(icon: ModalProps["icon"]) {
  if (!icon) return null
  if (React.isValidElement(icon)) return icon
  const IconComponent = icon as React.ComponentType<{ className?: string }>
  return <IconComponent className="w-5 h-5 text-primary shrink-0" />
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  icon,
  maxWidth = "md",
  onSubmit,
  footer,
  onOpenAutoFocus,
  className,
  contentClassName,
  children,
}: ModalProps) {
  const maxWidthClass =
    maxWidth === "sm"
      ? "sm:max-w-sm"
      : maxWidth === "lg"
        ? "sm:max-w-lg"
        : "sm:max-w-md"

  const content = onSubmit ? (
    <form onSubmit={onSubmit} className={cn("flex flex-col flex-1 space-y-4 py-2", contentClassName)}>
      {children}
      {footer && <DialogFooter className="pt-2">{footer}</DialogFooter>}
    </form>
  ) : (
    <>
      <div className={cn("flex flex-col flex-1 space-y-4 py-2", contentClassName)}>
        {children}
      </div>
      {footer && <DialogFooter className="pt-2">{footer}</DialogFooter>}
    </>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(maxWidthClass, className)}
        onOpenAutoFocus={onOpenAutoFocus}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {renderModalIcon(icon)}
            <span>{title}</span>
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}
Modal.displayName = "Modal"

export interface ConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  icon?: LucideIcon | React.ComponentType<{ className?: string }> | React.ReactNode
  confirmText?: React.ReactNode
  cancelText?: React.ReactNode
  onConfirm: (e: React.MouseEvent<HTMLButtonElement>) => void
  onCancel?: () => void
  loading?: boolean
  disabled?: boolean
  variant?: "destructive" | "default"
  className?: string
  children?: React.ReactNode
}

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  icon,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  loading = false,
  disabled = false,
  variant = "destructive",
  className,
  children,
}: ConfirmModalProps) {
  const { t } = useTranslation()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={className}>
        <AlertDialogHeader>
          <AlertDialogTitle
            className={cn(
              "flex items-center gap-2",
              variant === "destructive" && "text-destructive"
            )}
          >
            {renderModalIcon(icon)}
            <span>{title}</span>
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {children}

        <AlertDialogFooter className="flex-row items-center justify-end gap-2 pt-2">
          <AlertDialogCancel
            disabled={loading || disabled}
            onClick={onCancel}
            className="flex-1 sm:flex-none"
          >
            {cancelText ?? t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading || disabled}
            className={cn(
              variant === "destructive" &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              "flex-1 sm:flex-none"
            )}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
            {confirmText ?? (variant === "destructive" ? t("common.delete") : t("common.confirm"))}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
ConfirmModal.displayName = "ConfirmModal"
