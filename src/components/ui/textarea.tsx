import * as React from "react"
import { cn } from "@/lib/utils"

export type TextareaProps = React.ComponentProps<"textarea">

const Textarea = ({ className, ref, ...props }: TextareaProps) => {
    return (
        <textarea
            className={cn(
                "flex min-h-[60px] w-full rounded-xl border border-transparent bg-card px-3 py-2 text-base md:text-sm shadow-xs placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-transparent focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
                className
            )}
            ref={ref}
            {...props}
        />
    )
}
Textarea.displayName = "Textarea"

export { Textarea }
