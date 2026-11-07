import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { useMobileModalViewport } from "@/hooks/use-visual-viewport"

const AlertDialog = AlertDialogPrimitive.Root

const AlertDialogTrigger = AlertDialogPrimitive.Trigger

const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = ({
    className,
    ref,
    ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay> & {
    ref?: React.Ref<React.ElementRef<typeof AlertDialogPrimitive.Overlay>>
}) => (
    <AlertDialogPrimitive.Overlay
        className={cn(
            "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            className
        )}
        {...props}
        ref={ref}
    />
)
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

const AlertDialogContent = ({
    className,
    style,
    ref,
    ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> & {
    ref?: React.Ref<React.ElementRef<typeof AlertDialogPrimitive.Content>>
}) => {
    const { i18n } = useTranslation()
    const [containerNode, setContainerNode] = React.useState<HTMLDivElement | null>(null)
    const { viewportStyle, isKeyboardOpen } = useMobileModalViewport(containerNode)

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
        <AlertDialogPortal>
            <AlertDialogOverlay />
            <AlertDialogPrimitive.Content
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
            />
        </AlertDialogPortal>
    )
}
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

const AlertDialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col space-y-2 text-start shrink-0",
            className
        )}
        {...props}
    />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({
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
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = ({
    className,
    ref,
    ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title> & {
    ref?: React.Ref<React.ElementRef<typeof AlertDialogPrimitive.Title>>
}) => (
    <AlertDialogPrimitive.Title
        ref={ref}
        className={cn("text-lg font-semibold", className)}
        {...props}
    />
)
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const AlertDialogDescription = ({
    className,
    ref,
    ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description> & {
    ref?: React.Ref<React.ElementRef<typeof AlertDialogPrimitive.Description>>
}) => (
    <AlertDialogPrimitive.Description
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
)
AlertDialogDescription.displayName =
    AlertDialogPrimitive.Description.displayName

const AlertDialogAction = ({
    className,
    ref,
    ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action> & {
    ref?: React.Ref<React.ElementRef<typeof AlertDialogPrimitive.Action>>
}) => (
    <AlertDialogPrimitive.Action
        ref={ref}
        className={cn(buttonVariants(), className)}
        {...props}
    />
)
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

const AlertDialogCancel = ({
    className,
    ref,
    ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel> & {
    ref?: React.Ref<React.ElementRef<typeof AlertDialogPrimitive.Cancel>>
}) => (
    <AlertDialogPrimitive.Cancel
        ref={ref}
        className={cn(
            buttonVariants({ variant: "outline" }),
            className
        )}
        {...props}
    />
)
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

export {
    AlertDialog,
    AlertDialogPortal,
    AlertDialogOverlay,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
}
