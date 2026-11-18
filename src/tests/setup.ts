import '@testing-library/jest-dom'
import { vi } from 'vitest'

// 1. Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
})

// 2. Mock ResizeObserver
window.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
}

// 3. Mock react-i18next
const stableT = (key: string) => {
    if (key === 'common.date_format') return 'yyyy-MM-dd'
    return key
}
const stableI18n = {
    changeLanguage: () => new Promise(() => { }),
    language: 'en',
    dir: () => 'ltr',
}

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: stableT,
        i18n: stableI18n,
    }),
    initReactI18next: {
        type: '3rdParty',
        init: () => { },
    },
    // Mock Trans component if used
    Trans: ({ children }: { children: unknown }) => children,
}))

// 4. Mock theme provider
vi.mock('@/components/theme-provider', () => ({
    useTheme: () => ({
        theme: 'light',
        setTheme: vi.fn(),
        resolvedTheme: 'light',
        systemTheme: 'light',
        themes: ['light', 'dark', 'system'],
    }),
    ThemeProvider: ({ children }: { children: unknown }) => children,
}))

// 5. Suppress Happy-DOM Animation cancellation AbortError
if (typeof window !== 'undefined' && window.Animation) {
    const originalCancel = window.Animation.prototype.cancel
    window.Animation.prototype.cancel = function () {
        if (this.finished) {
            this.finished.catch(() => {})
        }
        return originalCancel.call(this)
    }
}
