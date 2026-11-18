import * as React from "react"

export type Theme = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

export interface ThemeProviderProps {
    children: React.ReactNode
    attribute?: "class" | `data-${string}`
    defaultTheme?: Theme
    enableSystem?: boolean
    enableColorScheme?: boolean
    storageKey?: string
}

export interface UseThemeProps {
    theme: string | undefined
    setTheme: (theme: string) => void
    resolvedTheme: ResolvedTheme | undefined
    systemTheme: ResolvedTheme | undefined
    themes: string[]
}

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)"

const ThemeContext = React.createContext<UseThemeProps | undefined>(undefined)

function getSystemTheme(): ResolvedTheme {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return "light"
    }
    return window.matchMedia(COLOR_SCHEME_QUERY).matches ? "dark" : "light"
}

function getStoredTheme(storageKey: string, fallback: Theme): string {
    if (typeof window === "undefined") return fallback
    try {
        return window.localStorage.getItem(storageKey) || fallback
    } catch {
        return fallback
    }
}

export function ThemeProvider({
    children,
    attribute = "class",
    defaultTheme = "system",
    enableSystem = true,
    enableColorScheme = true,
    storageKey = "theme",
}: ThemeProviderProps) {
    const [theme, setThemeState] = React.useState<string>(() =>
        getStoredTheme(storageKey, defaultTheme)
    )
    const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>(getSystemTheme)

    const resolvedTheme: ResolvedTheme =
        theme === "system" && enableSystem
            ? systemTheme
            : theme === "dark"
                ? "dark"
                : "light"

    const applyTheme = React.useCallback(
        (nextResolved: ResolvedTheme) => {
            if (typeof document === "undefined") return
            const root = document.documentElement

            if (attribute === "class") {
                root.classList.remove("light", "dark")
                root.classList.add(nextResolved)
            } else {
                root.setAttribute(attribute, nextResolved)
            }

            if (enableColorScheme) {
                root.style.colorScheme = nextResolved
            }
        },
        [attribute, enableColorScheme]
    )

    React.useEffect(() => {
        applyTheme(resolvedTheme)
    }, [applyTheme, resolvedTheme])

    React.useEffect(() => {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
            return
        }
        const media = window.matchMedia(COLOR_SCHEME_QUERY)
        const handleChange = () => {
            setSystemTheme(media.matches ? "dark" : "light")
        }
        handleChange()
        media.addEventListener("change", handleChange)
        return () => media.removeEventListener("change", handleChange)
    }, [])

    React.useEffect(() => {
        if (typeof window === "undefined") return
        const handleStorage = (event: StorageEvent) => {
            if (event.key !== storageKey) return
            setThemeState(event.newValue || defaultTheme)
        }
        window.addEventListener("storage", handleStorage)
        return () => window.removeEventListener("storage", handleStorage)
    }, [storageKey, defaultTheme])

    const setTheme = React.useCallback(
        (nextTheme: string) => {
            setThemeState(nextTheme)
            try {
                window.localStorage.setItem(storageKey, nextTheme)
            } catch {
                // Ignore storage errors
            }
        },
        [storageKey]
    )

    const value = React.useMemo<UseThemeProps>(
        () => ({
            theme,
            setTheme,
            resolvedTheme,
            systemTheme: enableSystem ? systemTheme : undefined,
            themes: enableSystem ? ["light", "dark", "system"] : ["light", "dark"],
        }),
        [theme, setTheme, resolvedTheme, enableSystem, systemTheme]
    )

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): UseThemeProps {
    const ctx = React.useContext(ThemeContext)
    if (!ctx) {
        return {
            theme: "light",
            setTheme: () => {},
            resolvedTheme: "light",
            systemTheme: undefined,
            themes: ["light", "dark"],
        }
    }
    return ctx
}
