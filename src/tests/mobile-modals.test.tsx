import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog"

describe("Mobile Bottom-Sheet Dialog & AlertDialog Component Tests", () => {
  const originalInnerWidth = window.innerWidth

  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
  })

  it("renders DialogContent with mobile bottom-sheet classes, blurred overlay, and sm desktop classes", () => {
    render(
      <Dialog open={true}>
        <DialogContent data-testid="dialog-content">
          <DialogHeader>
            <DialogTitle>Test Title</DialogTitle>
            <DialogDescription>Test Description</DialogDescription>
          </DialogHeader>
          <div>Modal Body</div>
        </DialogContent>
      </Dialog>
    )

    const content = screen.getByTestId("dialog-content")
    expect(content).toBeInTheDocument()

    // Verify mobile bottom-sheet styling classes
    expect(content.className).toContain("fixed")
    expect(content.className).toContain("inset-x-0")
    expect(content.className).toContain("bottom-0")
    expect(content.className).toContain("w-full")
    expect(content.className).toContain("max-h-[90dvh]")
    expect(content.className).toContain("rounded-t-3xl")
    expect(content.className).toContain("slide-in-from-bottom")
    expect(content.className).toContain("slide-out-to-bottom")
    expect(content.className).toContain("overflow-y-auto")

    // Verify mobile-only drag handle pill is rendered and close X button is hidden on mobile
    const handle = content.querySelector("[data-sheet-handle]")
    expect(handle).toBeInTheDocument()
    expect(handle?.className).toContain("sm:hidden")
    const closeBtn = content.querySelector("button[type='button']")
    expect(closeBtn?.className).toContain("hidden")
    expect(closeBtn?.className).toContain("sm:flex")

    // Verify desktop responsive breakpoint overrides remain centered card
    expect(content.className).toContain("sm:inset-auto")
    expect(content.className).toContain("sm:left-[50%]")
    expect(content.className).toContain("sm:top-[50%]")
    expect(content.className).toContain("sm:rounded-xl")
    expect(content.className).toContain("sm:border")

    // Verify blurred backdrop overlay on mobile
    const overlay = document.body.querySelector("[class*='backdrop-blur-sm']")
    expect(overlay).toBeInTheDocument()
  })

  it("renders AlertDialogContent with mobile bottom-sheet classes, blurred overlay, and sm desktop classes", () => {
    render(
      <AlertDialog open={true}>
        <AlertDialogContent data-testid="alert-dialog-content">
          <AlertDialogHeader>
            <AlertDialogTitle>Alert Title</AlertDialogTitle>
            <AlertDialogDescription>Alert Description</AlertDialogDescription>
          </AlertDialogHeader>
          <div>Alert Body</div>
        </AlertDialogContent>
      </AlertDialog>
    )

    const content = screen.getByTestId("alert-dialog-content")
    expect(content).toBeInTheDocument()

    // Verify mobile bottom-sheet styling classes
    expect(content.className).toContain("fixed")
    expect(content.className).toContain("inset-x-0")
    expect(content.className).toContain("bottom-0")
    expect(content.className).toContain("w-full")
    expect(content.className).toContain("max-h-[90dvh]")
    expect(content.className).toContain("rounded-t-3xl")
    expect(content.className).toContain("slide-in-from-bottom")
    expect(content.className).toContain("slide-out-to-bottom")

    // Verify mobile-only drag handle pill is rendered
    const handle = content.querySelector("[data-sheet-handle]")
    expect(handle).toBeInTheDocument()
    expect(handle?.className).toContain("sm:hidden")

    // Verify desktop responsive breakpoint overrides
    expect(content.className).toContain("sm:inset-auto")
    expect(content.className).toContain("sm:left-[50%]")
    expect(content.className).toContain("sm:top-[50%]")
    expect(content.className).toContain("sm:rounded-xl")

    // Verify blurred backdrop overlay on mobile
    const overlay = document.body.querySelector("[class*='backdrop-blur-sm']")
    expect(overlay).toBeInTheDocument()
  })

  it("supports swipe-down gesture on mobile to close Dialog", () => {
    const onOpenChange = vi.fn()
    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent data-testid="swipe-dialog">
          <DialogHeader>
            <DialogTitle>Swipe Dialog</DialogTitle>
            <DialogDescription>Swipe down to dismiss</DialogDescription>
          </DialogHeader>
          <div>Body</div>
        </DialogContent>
      </Dialog>
    )

    const content = screen.getByTestId("swipe-dialog")
    const handle = content.querySelector("[data-sheet-handle]") as HTMLElement

    fireEvent.touchStart(handle, {
      touches: [{ clientX: 180, clientY: 100 }],
      changedTouches: [{ clientX: 180, clientY: 100 }],
    })
    fireEvent.touchMove(handle, {
      touches: [{ clientX: 180, clientY: 220 }],
      changedTouches: [{ clientX: 180, clientY: 220 }],
    })
    fireEvent.touchEnd(handle, {
      changedTouches: [{ clientX: 180, clientY: 220 }],
    })

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("supports swipe-down gesture on mobile to close AlertDialog", () => {
    const onOpenChange = vi.fn()
    render(
      <AlertDialog open={true} onOpenChange={onOpenChange}>
        <AlertDialogContent data-testid="swipe-alert-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Swipe Alert</AlertDialogTitle>
            <AlertDialogDescription>Swipe down to dismiss</AlertDialogDescription>
          </AlertDialogHeader>
          <div>Body</div>
        </AlertDialogContent>
      </AlertDialog>
    )

    const content = screen.getByTestId("swipe-alert-dialog")
    const handle = content.querySelector("[data-sheet-handle]") as HTMLElement

    fireEvent.touchStart(handle, {
      touches: [{ clientX: 180, clientY: 100 }],
      changedTouches: [{ clientX: 180, clientY: 100 }],
    })
    fireEvent.touchMove(handle, {
      touches: [{ clientX: 180, clientY: 220 }],
      changedTouches: [{ clientX: 180, clientY: 220 }],
    })
    fireEvent.touchEnd(handle, {
      changedTouches: [{ clientX: 180, clientY: 220 }],
    })

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("ensures no edit field is automatically focused when Dialog opens", () => {
    render(
      <Dialog open={true}>
        <DialogContent data-testid="dialog-with-input">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Description</DialogDescription>
          </DialogHeader>
          <input data-testid="test-input" placeholder="Enter name" />
          <textarea data-testid="test-textarea" placeholder="Enter notes" />
        </DialogContent>
      </Dialog>
    )

    const input = screen.getByTestId("test-input")
    const textarea = screen.getByTestId("test-textarea")

    // Neither input nor textarea should have focus upon dialog open
    expect(document.activeElement).not.toBe(input)
    expect(document.activeElement).not.toBe(textarea)
  })

  it("ensures no edit field is automatically focused when AlertDialog opens", () => {
    render(
      <AlertDialog open={true}>
        <AlertDialogContent data-testid="alert-with-input">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>Description</AlertDialogDescription>
          </AlertDialogHeader>
          <input data-testid="alert-input" placeholder="Type CONFIRM" />
        </AlertDialogContent>
      </AlertDialog>
    )

    const input = screen.getByTestId("alert-input")
    expect(document.activeElement).not.toBe(input)
  })
})
