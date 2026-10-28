import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './i18n'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

import { ThemeProvider } from "./components/theme-provider"

// Clean up any stale service workers and caches that intercept navigations
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister()
    }
  }).catch(() => {
    // Ignore cleanup errors
  })

  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key))
    }).catch(() => {
      // Ignore cache deletion errors
    })
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="school-ui-theme">
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)

