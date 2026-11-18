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
        const bottomOffset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
        setViewportStyle({
          bottom: `${bottomOffset}px`,
          maxHeight: `${Math.max(240, vv.height - 24)}px`,
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

interface SheetTouchState {
  active: boolean
  locked: boolean
  fromHandle: boolean
  startX: number
  startY: number
  startTime: number
}

const INITIAL_SHEET_TOUCH: SheetTouchState = {
  active: false,
  locked: false,
  fromHandle: false,
  startX: 0,
  startY: 0,
  startTime: 0,
}

function canStartSheetSwipe(target: EventTarget | null, container: HTMLElement | null): boolean {
  let el = target instanceof HTMLElement ? target : null
  while (el && el !== container) {
    const tag = el.tagName
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable) {
      return false
    }
    const style = window.getComputedStyle(el)
    if ((style.overflowY === "auto" || style.overflowY === "scroll") && el.scrollTop > 0) {
      return false
    }
    el = el.parentElement
  }
  if (container && container.scrollTop > 0) {
    return false
  }
  return true
}

/**
 * Hook for mobile (< 640px) bottom-sheet modals to support swipe-down-to-close.
 */
export function useMobileSheetSwipeToClose(
  container: HTMLElement | null,
  onClose: () => void
) {
  const touchRef = React.useRef<SheetTouchState>(INITIAL_SHEET_TOUCH)
  const [dragOffset, setDragOffset] = React.useState(0)
  const [isDragging, setIsDragging] = React.useState(false)

  const reset = React.useCallback(() => {
    touchRef.current = INITIAL_SHEET_TOUCH
    setIsDragging(false)
    setDragOffset(0)
  }, [])

  const onTouchStart = React.useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (typeof window === "undefined" || window.innerWidth >= 640) return
      if (e.touches.length !== 1) return

      const targetEl = e.target instanceof HTMLElement ? e.target : null
      const fromHandle = Boolean(targetEl?.closest("[data-sheet-handle]"))

      if (!fromHandle && !canStartSheetSwipe(e.target, container)) {
        return
      }

      const touch = e.touches[0]
      touchRef.current = {
        active: true,
        locked: fromHandle,
        fromHandle,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
      }
      if (fromHandle) {
        setIsDragging(true)
      }
    },
    [container]
  )

  const onTouchMove = React.useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      const state = touchRef.current
      if (!state.active || e.touches.length !== 1) return
      if (typeof window !== "undefined" && window.innerWidth >= 640) return

      const touch = e.touches[0]
      const deltaX = touch.clientX - state.startX
      const deltaY = touch.clientY - state.startY

      if (!state.locked) {
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 6) {
          reset()
          return
        }
        if (deltaY < -4) {
          reset()
          return
        }
        if (deltaY <= 8) {
          return
        }
        if (!canStartSheetSwipe(e.target, container)) {
          reset()
          return
        }
        state.locked = true
        setIsDragging(true)
      }

      const nextOffset = Math.max(0, deltaY)
      setDragOffset(nextOffset)
    },
    [container, reset]
  )

  const onTouchEnd = React.useCallback(() => {
    const state = touchRef.current
    if (!state.active) return

    const elapsed = Math.max(1, Date.now() - state.startTime)
    const velocity = dragOffset / elapsed
    const shouldClose = state.locked && (dragOffset >= 80 || (velocity >= 0.5 && dragOffset > 20))

    reset()

    if (shouldClose) {
      onClose()
    }
  }, [dragOffset, onClose, reset])

  const swipeStyle: React.CSSProperties =
    dragOffset > 0 || isDragging
      ? {
          transform: `translate3d(0, ${dragOffset}px, 0)`,
          transition: isDragging ? "none" : "transform 220ms cubic-bezier(0.32, 0.72, 0, 1)",
        }
      : {}

  const swipeHandlers = {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel: reset,
  }

  return { swipeStyle, swipeHandlers }
}
