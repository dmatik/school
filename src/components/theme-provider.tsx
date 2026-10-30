import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

function ThemeColorMeta() {
    const { resolvedTheme } = useTheme()

    React.useEffect(() => {
        if (typeof document === "undefined") return
        const isDark = resolvedTheme === "dark"
        // Ensure the iOS status bar and browser top chrome match the header surface (card) in both themes
        const headerColor = isDark ? "#182030" : "#ffffff"

        const metaTags = document.querySelectorAll('meta[name="theme-color"]')
        if (metaTags.length > 0) {
            metaTags.forEach((tag) => tag.setAttribute("content", headerColor))
        } else {
            const meta = document.createElement("meta")
            meta.setAttribute("name", "theme-color")
            meta.setAttribute("content", headerColor)
            document.head.appendChild(meta)
        }
    }, [resolvedTheme])

    return null
}

export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    return (
        <NextThemesProvider {...props}>
            <ThemeColorMeta />
            {children}
        </NextThemesProvider>
    )
}
