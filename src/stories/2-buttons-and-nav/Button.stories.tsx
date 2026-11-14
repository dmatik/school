import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { Button, LiquidButton } from "@/components/ui/button"
import { Plus, Trash2, Check, RefreshCw, Loader2, Fingerprint, Printer } from "lucide-react"

const meta: Meta<typeof Button> = {
  title: "2. Buttons & Navigation/Button",
  component: Button,
  parameters: {
    docs: {
      description: {
        component: "Primary button component with variants (default, secondary, outline, ghost, destructive, link), sizes, and action states.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="default">ראשי (Default)</Button>
      <Button variant="secondary">משני (Secondary)</Button>
      <Button variant="outline">מסגרת (Outline)</Button>
      <Button variant="ghost">שקוף (Ghost)</Button>
      <Button variant="destructive">מחיקה (Destructive)</Button>
      <Button variant="link">קישור (Link)</Button>
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">קטן (sm)</Button>
      <Button size="default">רגיל (default)</Button>
      <Button size="lg">גדול (lg)</Button>
      <Button size="icon" title="אייקון">
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  ),
}

export const ActionStates: Story = {
  render: function Render() {
    const [syncing, setSyncing] = React.useState(false)
    const [synced, setSynced] = React.useState(false)

    const triggerSync = () => {
      setSyncing(true)
      setTimeout(() => {
        setSyncing(false)
        setSynced(true)
        setTimeout(() => setSynced(false), 2500)
      }, 1200)
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Loading button */}
          <Button disabled>
            <Loader2 className="w-4 h-4 animate-spin me-2" />
            טוען נתונים...
          </Button>

          {/* Destructive with icon */}
          <Button variant="destructive" size="sm">
            <Trash2 className="w-4 h-4 me-1.5" />
            מחק רשומה
          </Button>

          {/* Passkey login style */}
          <Button variant="outline" className="rounded-full border-primary/25 hover:bg-primary/5">
            <Fingerprint className="w-4 h-4 text-primary me-2" />
            כניסה באמצעות Passkey
          </Button>
        </div>

        {/* Dynamic Sync Button Simulation */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-2 max-w-sm">
          <div className="text-xs font-semibold text-muted-foreground">הדמיית כפתור סנכרון Webtop:</div>
          <Button
            variant="outline"
            size="sm"
            onClick={triggerSync}
            disabled={syncing}
            className={synced ? "border-[#2CA58D]/50 bg-[#2CA58D]/15 text-[#2CA58D] dark:text-[#9EE8D8]" : ""}
          >
            {synced ? (
              <>
                <Check className="w-4 h-4 me-1.5 stroke-[2.5px]" />
                סונכרן בהצלחה!
              </>
            ) : syncing ? (
              <>
                <RefreshCw className="w-4 h-4 me-1.5 animate-spin" />
                מסנכרן כעת...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 me-1.5" />
                סנכרן מול Webtop
              </>
            )}
          </Button>
        </div>
      </div>
    )
  },
}

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button disabled variant="default">ראשי מושבת</Button>
      <Button disabled variant="secondary">משני מושבת</Button>
      <Button disabled variant="outline">מסגרת מושבתת</Button>
      <Button disabled variant="destructive">מחיקה מושבתת</Button>
    </div>
  ),
}

export const LiquidFilterButton: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <LiquidButton icon={Printer}>הדפסה</LiquidButton>
      <LiquidButton icon={Printer} active>
        הדפסה (פעיל)
      </LiquidButton>
      <LiquidButton icon={Printer} disabled>
        הדפסה (מושבת)
      </LiquidButton>
    </div>
  ),
}
