import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { SyncButton } from "@/components/ui/sync-button"

const meta: Meta<typeof SyncButton> = {
  title: "2. Buttons & Navigation/SyncButton",
  component: SyncButton,
  parameters: {
    docs: {
      description: {
        component: "Dedicated Webtop synchronization button supporting both compact icon-only mode (for header and sidebar) and outline pill mode (for settings and detail surfaces) with animated state transitions.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof SyncButton>

export const InteractiveSimulation: Story = {
  render: function Render() {
    const [syncing, setSyncing] = React.useState(false)
    const [success, setSuccess] = React.useState(false)

    const handleSync = () => {
      setSyncing(true)
      setSuccess(false)
      setTimeout(() => {
        setSyncing(false)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2500)
      }, 1500)
    }

    return (
      <div className="space-y-6 max-w-lg">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-muted-foreground">
            כפתור סנכרון מסגרת עגול (Outline Pill - בשימוש בהגדרות):
          </div>
          <div className="flex items-center gap-3">
            <SyncButton
              variant="outline"
              onClick={handleSync}
              syncing={syncing}
              success={success}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold text-muted-foreground">
            כפתור סנכרון אייקון עגול (Icon Mode - בשימוש בכותרת ובסרגל הצד):
          </div>
          <div className="flex items-center gap-3">
            <SyncButton
              variant="icon"
              onClick={handleSync}
              syncing={syncing}
              success={success}
            />
          </div>
        </div>
      </div>
    )
  },
}

export const OutlinePillStates: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-muted-foreground">
        מצבי כפתור סנכרון מסגרת (Webtop Settings):
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {/* Idle */}
        <SyncButton variant="outline" />

        {/* Syncing */}
        <SyncButton variant="outline" syncing={true} />

        {/* Success */}
        <SyncButton variant="outline" success={true} />

        {/* Disabled */}
        <SyncButton variant="outline" disabled={true} />
      </div>
    </div>
  ),
}

export const IconModes: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-muted-foreground">
        מצבי כפתור סנכרון אייקון (Header & Sidebar):
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {/* Idle */}
        <SyncButton variant="icon" />

        {/* Syncing */}
        <SyncButton variant="icon" syncing={true} />

        {/* Success */}
        <SyncButton variant="icon" success={true} />

        {/* Disabled */}
        <SyncButton variant="icon" disabled={true} />
      </div>
    </div>
  ),
}
