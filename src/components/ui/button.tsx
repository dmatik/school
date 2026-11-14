import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs hover:shadow-sm",
                destructive:
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs",
                outline:
                    "border border-border bg-card text-foreground hover:bg-accent/60 hover:text-accent-foreground shadow-xs",
                secondary:
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                ghost: "hover:bg-accent hover:text-accent-foreground",
                link: "text-primary underline-offset-4 hover:underline",
                liquid:
                    "h-10 py-0 px-3.5 rounded-full border border-transparent shadow-xs transition-all shrink-0 apple-liquid-dock flex items-center gap-2 select-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 font-medium text-muted-foreground hover:text-foreground",
            },
            size: {
                default: "h-10 px-5 py-2 rounded-full",
                sm: "h-8 rounded-full px-3 text-xs",
                lg: "h-11 rounded-full px-6",
                icon: "h-9 w-9 rounded-full",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

function Button({
    className,
    variant,
    size,
    asChild = false,
    ref,
    ...props
}: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) {
    const Comp = asChild ? Slot : "button"
    return (
        <Comp
            className={cn(buttonVariants({ variant, size, className }))}
            ref={ref}
            {...props}
        />
    )
}
Button.displayName = "Button"

export interface LiquidButtonProps extends Omit<ButtonProps, "variant"> {
    /** Optional leading icon rendered at the same scale as LiquidDatePicker. */
    icon?: React.ComponentType<{ className?: string }>
    /** Marks the button as active (high-contrast foreground text/icon). */
    active?: boolean
}

/**
 * Apple Liquid Glass pill button matching the filter-row aesthetic of LiquidDatePicker.
 */
function LiquidButton({
    icon: Icon,
    active = false,
    children,
    className,
    type = "button",
    ref,
    ...props
}: LiquidButtonProps & { ref?: React.Ref<HTMLButtonElement> }) {
    return (
        <Button
            ref={ref}
            type={type}
            variant="liquid"
            className={cn(
                active && "text-foreground",
                className
            )}
            {...props}
        >
            {Icon && (
                <Icon
                    className={cn(
                        "w-5 h-5 shrink-0 stroke-[1.85px] transition-colors",
                        active ? "text-foreground" : "text-current"
                    )}
                />
            )}
            {children && (
                <span className="text-base whitespace-nowrap translate-y-px">
                    {children}
                </span>
            )}
        </Button>
    )
}
LiquidButton.displayName = "LiquidButton"

// eslint-disable-next-line react-refresh/only-export-components
export { Button, LiquidButton, buttonVariants }
