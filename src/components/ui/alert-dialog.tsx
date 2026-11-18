import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { useMobileModalViewport, useMobileSheetSwipeToClose } from "@/hooks/use-visual-viewport"

interface AlertDialogContextValue {
    onOpenChange?: (open: boolean) => void
}

const AlertDialogContext = React.createContext<AlertDialogContextValue>({})

const AlertDialog = ({
    onOpenChange,
    ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) => (
    <AlertDialogContext.Provider value={{ onOpenChange }}>
        <AlertDialogPrimitive.Root onOpenChange={onOpenChange} {...props} />
    </AlertDialogContext.Provider>
)

const AlertDialogTrigger = AlertDialogPrimitive.Trigger

const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = ({
    className,
    onClick,
    ref,
    ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay> & {
    ref?: React.Ref<React.ElementRef<typeof AlertDialogPrimitive.Overlay>>
}) => {
    const { onOpenChange } = React.useContext(AlertDialogContext)

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        onClick?.(e)
        if (!e.defaultPrevented && typeof window !== "undefined" && window.innerWidth < 640) {
            onOpenChange?.(false)
        }
    }

    return (
        <AlertDialogPrimitive.Overlay
            onClick={handleClick}
            className={cn(
                "fixed -top-[max(4rem,env(safe-area-inset-top))] -bottom-[max(4rem,env(safe-area-inset-bottom))] inset-x-0 z-50 bg-black/45 dark:bg-black/65 backdrop-blur-sm [-webkit-backdrop-filter:blur(6px)] sm:inset-0 sm:bg-black/80 sm:backdrop-blur-none sm:[-webkit-backdrop-filter:none] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                className
            )}
            {...props}
            ref={ref}
        />
    )
}
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

const AlertDialogContent = ({
    className,
    children,
    style,
    ref,
    onOpenAutoFocus,
    ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> & {
    ref?: React.Ref<React.ElementRef<typeof AlertDialogPrimitive.Content>>
}) => {
    const { i18n } = useTranslation()
    const { onOpenChange } = React.useContext(AlertDialogContext)
    const [containerNode, setContainerNode] = React.useState<HTMLDivElement | null>(null)
    const { viewportStyle } = useMobileModalViewport(containerNode)

    const handleSwipeClose = React.useCallback(() => {
        if (onOpenChange) {
            onOpenChange(false)
        } else {
            const cancelBtn = containerNode?.querySelector("[data-alert-cancel]") as HTMLElement | null
            cancelBtn?.click()
        }
    }, [onOpenChange, containerNode])

    const { swipeStyle, swipeHandlers } = useMobileSheetSwipeToClose(containerNode, handleSwipeClose)

    const handleOpenAutoFocus = React.useCallback(
        (event: Event) => {
            // Focus the modal container itself so focus is trapped inside the dialog
            // without auto-triggering mobile virtual keyboards on inputs
            event.preventDefault()
            containerNode?.focus()
            onOpenAutoFocus?.(event)
        },
        [onOpenAutoFocus, containerNode]
    )

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
                tabIndex={-1}
                dir={props.dir ?? (i18n.dir() as "ltr" | "rtl")}
                style={{ ...viewportStyle, ...swipeStyle, ...style }}
                onOpenAutoFocus={handleOpenAutoFocus}
                {...swipeHandlers}
                className={cn(
                    // Mobile (< 640px): Bottom-sliding sheet with rounded top corners and safe-area bottom padding
                    "fixed inset-x-0 bottom-0 z-50 flex flex-col w-full h-auto max-h-[90dvh] max-w-none rounded-t-3xl border-t border-border/60 bg-card px-4 pt-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl overflow-y-auto overscroll-contain duration-300",
                    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
                    // Desktop / Tablet (sm: >= 640px): Centered modal card (unchanged)
                    "sm:inset-auto sm:left-[50%] sm:top-[50%] sm:bottom-auto sm:grid sm:h-auto sm:max-h-[90dvh] sm:w-full sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:gap-4 sm:rounded-xl sm:border sm:border-border sm:p-6 sm:duration-200 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%] sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]",
                    className
                )}
                {...props}
            >
                <div
                    data-sheet-handle
                    aria-hidden="true"
                    className="sm:hidden flex justify-center pb-2.5 shrink-0 touch-none cursor-grab active:cursor-grabbing"
                >
                    <div className="w-10 h-1.5 rounded-full bg-muted-foreground/25" />
                </div>
                {children}
            </AlertDialogPrimitive.Content>
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
            "flex flex-col space-y-2 text-start pb-3 border-b border-border/50 sm:border-b-0 sm:pb-0 shrink-0",
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
        data-alert-cancel=""
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
