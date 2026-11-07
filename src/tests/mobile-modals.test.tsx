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
})
