import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { PageHeader } from "@/components/ui/page-header"
import { MobileHeader } from "@/components/ui/mobile-header"
import { SyncButton } from "@/components/ui/sync-button"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

const meta: Meta = {
  title: "2. Buttons & Navigation/Header",
  parameters: {
    docs: {
      description: {
        component: "Desktop page header and mobile top application header components.",
      },
    },
  },
}

export default meta

export const DesktopPageHeader: StoryObj<typeof PageHeader> = {
  render: function Render() {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="text-sm font-medium text-muted-foreground">
          כותרת עמוד רגילה (PageHeader בסיסי):
        </div>
        <div className="p-4 rounded-xl border bg-card">
          <PageHeader
            sticky={false}
            title="שיעורי בית"
            className="flex"
          />
        </div>

        <div className="text-sm font-medium text-muted-foreground">
          כותרת עמוד עם כפתורי פעולה (Actions):
        </div>
        <div className="p-4 rounded-xl border bg-card">
          <PageHeader
            sticky={false}
            title="לוח מבחנים"
            description="3 מבחנים עתידיים"
            actions={
              <Button size="sm" className="gap-1.5 rounded-full">
                <Plus className="w-4 h-4" />
                <span>הוסף מבחן</span>
              </Button>
            }
            className="flex"
          />
        </div>
      </div>
    )
  },
}

export const MobileAppHeader: StoryObj<typeof MobileHeader> = {
  render: function Render() {
    const [scrolled, setScrolled] = React.useState(false)
    const [syncing, setSyncing] = React.useState(false)
    const [syncSuccess, setSyncSuccess] = React.useState(false)

    const handleSync = () => {
      setSyncing(true)
      setSyncSuccess(false)
      setTimeout(() => {
        setSyncing(false)
        setSyncSuccess(true)
        setTimeout(() => setSyncSuccess(false), 2500)
      }, 1000)
    }

    return (
      <div className="space-y-6 max-w-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-muted-foreground">
            כותרת אפליקציה למובייל (MobileHeader):
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScrolled((s) => !s)}
          >
            {scrolled ? "בטל גלילה" : "הדמה גלילה"}
          </Button>
        </div>

        <div className="relative h-20 rounded-2xl border overflow-hidden bg-background">
          <MobileHeader
            title="אירועי משמעת"
            titleKey="incidents"
            username="דמיטרי ט."
            isScrolled={scrolled}
            action={
              <SyncButton
                onClick={handleSync}
                syncing={syncing}
                success={syncSuccess}
              />
            }
            className="relative"
          />
        </div>

        <div className="text-xs text-muted-foreground">
          לחץ על כפתור הסנכרון (בצד שמאל/ימין בהתאם לשפה) כדי לצפות באנימציית הסיבוב ובאייקון הווי הירוק.
        </div>
      </div>
    )
  },
}
