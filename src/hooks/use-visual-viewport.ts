import * as React from "react"

/**
 * Hook to adapt mobile modals to window.visualViewport when the virtual touch keyboard opens.
 * When viewport shrinks (e.g. keyboard opens on mobile Safari or Android Chrome),
 * sets height and top offset so the modal fits the exact visible portion of the viewport,
 * and scrolls the active/focused input into view with clearance.
 */
export function useMobileModalViewport(
  container: HTMLElement | null
) {
  const [viewportStyle, setViewportStyle] = React.useState<React.CSSProperties>({})
  const [isKeyboardOpen, setIsKeyboardOpen] = React.useState(false)

  // Scroll active/target element into view inside the modal container
  const scrollElementIntoView = React.useCallback(
    (targetEl?: HTMLElement | null, smooth = true) => {
      if (typeof window === "undefined" || window.innerWidth >= 640) return
      if (!container) return

      const target =
        targetEl || (document.activeElement as HTMLElement | null)

      if (!target || !container.contains(target)) return

      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.getAttribute("role") === "combobox" ||
        target.isContentEditable

      if (!isInput) return

      const containerRect = container.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()

      const topBuffer = 16
      // Reserve clearance for the iOS floating form accessory bar (^ v ✓) and keyboard edge
      const bottomBuffer = 72

      // Only scroll if the field is obscured behind the keyboard / bottom of the container
      if (targetRect.bottom > containerRect.bottom - bottomBuffer) {
        const overflowBottom = targetRect.bottom - (containerRect.bottom - bottomBuffer)
        container.scrollTo({
          top: container.scrollTop + overflowBottom,
          behavior: smooth ? "smooth" : "instant"
        })
      } else if (targetRect.top < containerRect.top + topBuffer) {
        // Only scroll if the field is scrolled above the top of the visible container
        const overflowTop = (containerRect.top + topBuffer) - targetRect.top
        container.scrollTo({
          top: Math.max(0, container.scrollTop - overflowTop),
          behavior: smooth ? "smooth" : "instant"
        })
      }
      // If the field is already fully visible above the keyboard, do not scroll.
    },
    [container]
  )

  React.useEffect(() => {
    if (typeof window === "undefined" || !container) return

    const updateViewport = () => {
      if (window.innerWidth >= 640) {
        setViewportStyle({})
        setIsKeyboardOpen(false)
        return
      }

      const vv = window.visualViewport
      if (!vv) {
        setViewportStyle({})
        setIsKeyboardOpen(false)
        return
      }

      const keyboardOpen =
        (window.innerHeight - vv.height > 80) ||
        (window.screen.height - vv.height > 180)

      setIsKeyboardOpen(keyboardOpen)

      if (keyboardOpen || vv.offsetTop > 0) {
        setViewportStyle({
          height: `${vv.height}px`,
          top: `${vv.offsetTop}px`,
          maxHeight: `${vv.height}px`
        })
      } else {
        setViewportStyle({})
      }

      // Re-scroll active element on viewport resize/scroll
      if (keyboardOpen) {
        scrollElementIntoView(null, false)
        requestAnimationFrame(() => {
          scrollElementIntoView(null, true)
        })
      }
    }

    const vv = window.visualViewport
    if (vv) {
      vv.addEventListener("resize", updateViewport)
      vv.addEventListener("scroll", updateViewport)
    }
    window.addEventListener("resize", updateViewport)
    updateViewport()

    const handleFocusIn = (e: FocusEvent) => {
      if (window.innerWidth >= 640) return
      const target = e.target as HTMLElement | null
      if (!target || !container.contains(target)) return

      const isTextEntry =
        (target.tagName === "INPUT" &&
          !["button", "checkbox", "radio", "submit", "reset", "file", "hidden"].includes(
            (target as HTMLInputElement).type
          )) ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable

      if (!isTextEntry) return

      setIsKeyboardOpen(true)

      // Multiple staggered scroll triggers to handle virtual keyboard slide-up
      scrollElementIntoView(target, false)
      setTimeout(() => scrollElementIntoView(target, true), 100)
      setTimeout(() => scrollElementIntoView(target, true), 300)
      setTimeout(() => scrollElementIntoView(target, true), 500)
    }

    const handleFocusOut = () => {
      if (window.innerWidth >= 640) return
      setTimeout(() => {
        const active = document.activeElement as HTMLElement | null
        const isStillInside = active && container.contains(active)
        const currentVv = window.visualViewport
        const keyboardStillOpen = currentVv ? (window.innerHeight - currentVv.height > 80) : false
        if (!isStillInside && !keyboardStillOpen) {
          setIsKeyboardOpen(false)
        }
      }, 150)
    }

    window.addEventListener("focusin", handleFocusIn)
    window.addEventListener("focusout", handleFocusOut)

    return () => {
      if (vv) {
        vv.removeEventListener("resize", updateViewport)
        vv.removeEventListener("scroll", updateViewport)
      }
      window.removeEventListener("resize", updateViewport)
      window.removeEventListener("focusin", handleFocusIn)
      window.removeEventListener("focusout", handleFocusOut)
    }
  }, [container, scrollElementIntoView])

  return { viewportStyle, isKeyboardOpen }
}
