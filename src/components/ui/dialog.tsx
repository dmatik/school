"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"
import { useMobileModalViewport } from "@/hooks/use-visual-viewport"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = ({
    className,
    ref,
    ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & {
    ref?: React.Ref<React.ElementRef<typeof DialogPrimitive.Overlay>>
}) => (
    <DialogPrimitive.Overlay
        ref={ref}
        className={cn(
            "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            className
        )}
        {...props}
    />
)
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = ({
    className,
    children,
    style,
    ref,
    ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    ref?: React.Ref<React.ElementRef<typeof DialogPrimitive.Content>>
}) => {
    const { t, i18n } = useTranslation()
    const [containerNode, setContainerNode] = React.useState<HTMLDivElement | null>(null)
    const { viewportStyle, isKeyboardOpen } = useMobileModalViewport(containerNode)

    // Merge external ref with internal state ref
    const setRefs = React.useCallback(
        (node: HTMLDivElement | null) => {
            setContainerNode(node)
            if (typeof ref === "function") {
                ref(node)
            } else if (ref && "current" in ref) {
                ;(ref as React.MutableRefObject<HTMLDivElement | null>).current = node
            }
        },
        [ref]
    )

    return (
        <DialogPortal>
            <DialogOverlay />
            <DialogPrimitive.Content
                ref={setRefs}
                dir={props.dir ?? (i18n.dir() as "ltr" | "rtl")}
                style={{ ...viewportStyle, ...style }}
                className={cn(
                    // Mobile: Full screen layout with safe areas and auto-scroll
                    "fixed inset-0 z-50 flex flex-col w-full h-full max-w-none rounded-none border-0 bg-card p-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl overflow-y-auto overscroll-contain",
                    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                    // Desktop / Tablet (sm: >= 640px): Centered modal card
                    "sm:inset-auto sm:left-[50%] sm:top-[50%] sm:grid sm:h-auto sm:max-h-[90dvh] sm:w-full sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:gap-4 sm:rounded-xl sm:border sm:border-border sm:p-6 sm:duration-200 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%] sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]",
                    isKeyboardOpen && "pb-[50vh] sm:pb-6",
                    className
                )}
                {...props}
            >
                {children}
                <DialogPrimitive.Close className="absolute end-4 top-[max(1rem,env(safe-area-inset-top))] sm:top-4 rounded-full p-2 opacity-70 ring-offset-background transition-opacity hover:opacity-100 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground flex items-center justify-center">
                    <X className="h-4 w-4" />
                    <span className="sr-only">{t('common.close')}</span>
                </DialogPrimitive.Close>
            </DialogPrimitive.Content>
        </DialogPortal>
    )
}
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col space-y-1.5 text-start pe-8 shrink-0",
            className
        )}
        {...props}
    />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-row items-center justify-end gap-2 pt-3 shrink-0",
            className
        )}
        {...props}
    />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = ({
    className,
    ref,
    ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> & {
    ref?: React.Ref<React.ElementRef<typeof DialogPrimitive.Title>>
}) => (
    <DialogPrimitive.Title
        ref={ref}
        className={cn(
            "text-lg font-semibold leading-none",
            className
        )}
        {...props}
    />
)
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = ({
    className,
    ref,
    ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description> & {
    ref?: React.Ref<React.ElementRef<typeof DialogPrimitive.Description>>
}) => (
    <DialogPrimitive.Description
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
)
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
    Dialog,
    DialogPortal,
    DialogOverlay,
    DialogClose,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
}
