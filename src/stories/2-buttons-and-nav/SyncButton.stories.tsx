import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { SyncButton } from "@/components/ui/sync-button"
import { PullToRefresh } from "@/components/ui/pull-to-refresh"

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

export const PullToRefreshStates: Story = {
  render: function Render() {
    const [refreshing, setRefreshing] = React.useState(false)
    const [success, setSuccess] = React.useState(false)

    const handleRefresh = () => {
      setRefreshing(true)
      setSuccess(false)
      setTimeout(() => {
        setRefreshing(false)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2000)
      }, 1200)
    }

    return (
      <div className="space-y-4 max-w-md">
        <div className="text-sm font-semibold text-muted-foreground">
          משיכה למטה לרענון (Pull-to-Refresh):
        </div>
        <div className="h-64 rounded-2xl border border-border/60 bg-card overflow-hidden">
          <PullToRefresh
            onRefresh={handleRefresh}
            refreshing={refreshing}
            success={success}
          >
            <div className="h-full overflow-y-auto overscroll-y-contain p-4 space-y-2">
              <p className="text-xs text-muted-foreground">
                במכשיר מגע ניתן למשוך כלפי מטה בראש הרשימה כדי לרענן נתונים.
              </p>
              <div className="pt-2 flex gap-2">
                <SyncButton
                  variant="outline"
                  onClick={handleRefresh}
                  syncing={refreshing}
                  success={success}
                />
              </div>
            </div>
          </PullToRefresh>
        </div>
      </div>
    )
  },
}
