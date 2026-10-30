import * as React from "react"

import { cn } from "@/lib/utils"

export type InputProps = React.ComponentProps<"input">

const Input = ({ className, type, ref, ...props }: InputProps) => {
    return (
        <input
            type={type}
            className={cn(
                "flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-sm shadow-xs transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            ref={ref}
            {...props}
        />
    )
}
Input.displayName = "Input"

export { Input }
