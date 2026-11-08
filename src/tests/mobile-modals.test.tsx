import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
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

describe("Mobile Full-screen Dialog & AlertDialog Component Tests", () => {
  it("renders DialogContent with full-screen mobile classes and sm desktop classes", () => {
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

    // Verify mobile full screen styling classes
    expect(content.className).toContain("fixed")
    expect(content.className).toContain("inset-0")
    expect(content.className).toContain("w-full")
    expect(content.className).toContain("h-full")
    expect(content.className).toContain("rounded-none")
    expect(content.className).toContain("border-0")
    expect(content.className).toContain("overflow-y-auto")

    // Verify desktop responsive breakpoint overrides
    expect(content.className).toContain("sm:inset-auto")
    expect(content.className).toContain("sm:left-[50%]")
    expect(content.className).toContain("sm:top-[50%]")
    expect(content.className).toContain("sm:rounded-xl")
    expect(content.className).toContain("sm:border")
  })

  it("renders AlertDialogContent with full-screen mobile classes and sm desktop classes", () => {
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

    // Verify mobile full screen styling classes
    expect(content.className).toContain("fixed")
    expect(content.className).toContain("inset-0")
    expect(content.className).toContain("w-full")
    expect(content.className).toContain("h-full")
    expect(content.className).toContain("rounded-none")
    expect(content.className).toContain("border-0")

    // Verify desktop responsive breakpoint overrides
    expect(content.className).toContain("sm:inset-auto")
    expect(content.className).toContain("sm:left-[50%]")
    expect(content.className).toContain("sm:top-[50%]")
    expect(content.className).toContain("sm:rounded-xl")
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
