import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RefreshCw, Check } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

export interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void
  refreshing?: boolean
  success?: boolean
  disabled?: boolean
  threshold?: number
  maxPull?: number
  refreshOffset?: number
  children: React.ReactNode
  className?: string
}

interface TouchTrackingState {
  active: boolean
  locked: boolean
  startX: number
  startY: number
}

const INITIAL_TOUCH_STATE: TouchTrackingState = {
  active: false,
  locked: false,
  startX: 0,
  startY: 0,
}

function isScrollableAtTop(target: EventTarget | null, boundary: HTMLElement | null): boolean {
  let el = target instanceof HTMLElement ? target : null
  while (el && el !== boundary) {
    if (
      el.getAttribute("role") === "dialog" ||
      el.hasAttribute("data-radix-popper-content-wrapper") ||
      el.hasAttribute("data-no-pull-refresh")
    ) {
      return false
    }
    const style = window.getComputedStyle(el)
    const overflowY = style.overflowY
    if ((overflowY === "auto" || overflowY === "scroll") && el.scrollTop > 0) {
      return false
    }
    el = el.parentElement
  }
  if (boundary && boundary.scrollTop > 0) {
    return false
  }
  return true
}

export function PullToRefresh({
  onRefresh,
  refreshing = false,
  success = false,
  disabled = false,
  threshold = 84,
  maxPull = 128,
  refreshOffset = 56,
  children,
  className,
}: PullToRefreshProps) {
  const { t } = useTranslation()
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const touchStateRef = React.useRef<TouchTrackingState>(INITIAL_TOUCH_STATE)
  const [pullDistance, setPullDistance] = React.useState(0)

  const resetTouch = React.useCallback(() => {
    touchStateRef.current = INITIAL_TOUCH_STATE
    setPullDistance(0)
  }, [])

  const handleTouchStart = React.useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (disabled || refreshing || e.touches.length !== 1) return
      if (!isScrollableAtTop(e.target, containerRef.current)) return

      const touch = e.touches[0]
      touchStateRef.current = {
        active: true,
        locked: false,
        startX: touch.clientX,
        startY: touch.clientY,
      }
    },
    [disabled, refreshing]
  )

  const handleTouchMove = React.useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const state = touchStateRef.current
      if (!state.active || disabled || refreshing || e.touches.length !== 1) return

      const touch = e.touches[0]
      const deltaX = touch.clientX - state.startX
      const deltaY = touch.clientY - state.startY

      if (!state.locked) {
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 6) {
          resetTouch()
          return
        }
        if (deltaY < -4) {
          resetTouch()
          return
        }
        if (deltaY <= 8) {
          return
        }
        if (!isScrollableAtTop(e.target, containerRef.current)) {
          resetTouch()
          return
        }
        state.locked = true
      }

      const damped = Math.max(0, Math.min(maxPull, deltaY * 0.55))
      setPullDistance(damped)
    },
    [disabled, refreshing, maxPull, resetTouch]
  )

  const handleTouchEnd = React.useCallback(() => {
    const state = touchStateRef.current
    if (!state.active) return

    const shouldRefresh = state.locked && pullDistance >= threshold && !refreshing && !disabled
    resetTouch()

    if (shouldRefresh) {
      void onRefresh()
    }
  }, [pullDistance, threshold, refreshing, disabled, resetTouch, onRefresh])

  const progress = Math.min(1, pullDistance / threshold)
  const isReady = pullDistance >= threshold
  const showIndicator = pullDistance > 4 || refreshing || success

  const statusLabel = success
    ? t("common.sync_success")
    : refreshing
      ? t("common.syncing")
      : isReady
        ? t("common.release_to_refresh")
        : t("common.pull_to_refresh")

  const isDragging = pullDistance > 0 && !refreshing && !success
  const contentOffset = refreshing || success ? refreshOffset : Math.round(pullDistance)
  const indicatorY = refreshing || success ? 0 : Math.max(-8, Math.round(pullDistance * 0.2 - 8))

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={resetTouch}
      className={cn("relative h-full w-full overflow-hidden", className)}
    >
      <AnimatePresence>
        {showIndicator && (
          <motion.div
            key="pull-to-refresh-indicator"
            role="status"
            aria-live="polite"
            aria-label={statusLabel}
            initial={{ opacity: 0, y: -12, scale: 0.85 }}
            animate={{
              opacity: refreshing || success ? 1 : Math.min(1, 0.35 + progress * 0.65),
              y: indicatorY,
              scale: refreshing || success ? 1 : 0.85 + progress * 0.15,
            }}
            exit={{ opacity: 0, y: -12, scale: 0.85 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="pointer-events-none fixed md:absolute top-[4rem] md:top-3 inset-x-0 z-30 flex justify-center print:hidden"
          >
            <div
              className={cn(
                "flex items-center justify-center w-9 h-9 rounded-full border shadow-md backdrop-blur-md transition-colors",
                success
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : isReady || refreshing
                    ? "border-primary/40 bg-card/95 text-primary"
                    : "border-border/60 bg-card/90 text-muted-foreground"
              )}
              title={statusLabel}
            >
              {success ? (
                <Check className="w-4 h-4 stroke-[2.5px]" />
              ) : (
                <RefreshCw
                  className={cn("w-4 h-4", refreshing && "animate-spin")}
                  style={
                    refreshing
                      ? undefined
                      : { transform: `rotate(${Math.round(progress * 180)}deg)` }
                  }
                />
              )}
              <span className="sr-only">{statusLabel}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        data-testid="pull-to-refresh-content"
        className={cn(
          "h-full w-full",
          !isDragging && "transition-transform duration-200 ease-out"
        )}
        style={
          contentOffset > 0
            ? { transform: `translate3d(0, ${contentOffset}px, 0)` }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  )
}
