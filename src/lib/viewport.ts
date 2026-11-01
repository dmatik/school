/**
 * iOS standalone PWA viewport height fix.
 *
 * When the app runs from the iPhone Home Screen with
 * `apple-mobile-web-app-status-bar-style="black-translucent"`, WebKit draws the
 * page all the way under the status bar, but reports the layout viewport
 * (`100%`, `100dvh`, `window.innerHeight`, `position: fixed; bottom: 0`) as
 * shorter by the status-bar height. The result is an empty strip at the bottom
 * of the screen and a bottom navigation bar that floats above it.
 *
 * In standalone mode on iPhone the app always occupies the full physical
 * screen, so we expose the real screen height as the `--app-height` CSS
 * variable. Everywhere else the variable is removed and CSS falls back to
 * `100dvh`.
 */

const APP_HEIGHT_VAR = '--app-height'

interface ViewportEnv {
  userAgent: string
  isStandalone: boolean
  isPortrait: boolean
  screenWidth: number
  screenHeight: number
  innerHeight: number
}

/**
 * Returns the app height in CSS pixels for an iPhone standalone PWA,
 * or `null` when the default `100dvh` should be used.
 */
export function computeAppHeight(env: ViewportEnv): number | null {
  const isIPhone = /iPhone|iPod/.test(env.userAgent)
  if (!env.isStandalone || !isIPhone) return null

  const longSide = Math.max(env.screenWidth, env.screenHeight)
  const shortSide = Math.min(env.screenWidth, env.screenHeight)
  const screenHeight = env.isPortrait ? longSide : shortSide

  if (!screenHeight) return null
  return Math.max(env.innerHeight, screenHeight)
}

function readEnv(): ViewportEnv {
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return {
    userAgent: nav.userAgent,
    isStandalone:
      nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true,
    isPortrait: window.matchMedia?.('(orientation: portrait)').matches ?? window.innerHeight >= window.innerWidth,
    screenWidth: window.screen?.width ?? 0,
    screenHeight: window.screen?.height ?? 0,
    innerHeight: window.innerHeight,
  }
}

export function syncAppHeight(): void {
  const root = document.documentElement
  const height = computeAppHeight(readEnv())
  if (height === null) {
    root.style.removeProperty(APP_HEIGHT_VAR)
  } else {
    root.style.setProperty(APP_HEIGHT_VAR, `${height}px`)
  }
}

/** Installs the height sync and keeps it updated on resize / rotation. */
export function installAppHeightSync(): () => void {
  syncAppHeight()
  window.addEventListener('resize', syncAppHeight)
  window.addEventListener('orientationchange', syncAppHeight)
  return () => {
    window.removeEventListener('resize', syncAppHeight)
    window.removeEventListener('orientationchange', syncAppHeight)
  }
}

