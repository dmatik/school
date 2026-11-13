import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { PageHeader } from "@/components/ui/page-header"
import { MobileHeader, LastSyncedLabel } from "@/components/ui/mobile-header"
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
    const [lastSyncedAt, setLastSyncedAt] = React.useState<string>("2026-11-13T16:20:00")

    const handleSync = () => {
      setSyncing(true)
      setSyncSuccess(false)
      setTimeout(() => {
        setSyncing(false)
        setSyncSuccess(true)
        setLastSyncedAt(new Date().toISOString())
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

        <div className="rounded-2xl border overflow-hidden bg-background shadow-xs">
          <MobileHeader
            fixed={false}
            title="אירועי משמעת"
            titleKey="incidents"
            lastSyncedAt={lastSyncedAt}
            username="דמיטרי ט."
            isScrolled={scrolled}
            action={
              <SyncButton
                onClick={handleSync}
                syncing={syncing}
                success={syncSuccess}
              />
            }
          />
        </div>

        <div className="text-xs text-muted-foreground">
          לחץ על כפתור הסנכרון (בצד שמאל/ימין בהתאם לשפה) כדי לצפות באנימציית הסיבוב, באייקון הווי הירוק ובעדכון השעה.
        </div>
      </div>
    )
  },
}

export const MobileHeaderWithPhotoAvatar: StoryObj<typeof MobileHeader> = {
  render: function Render() {
    const [syncing, setSyncing] = React.useState(false)
    const handleSync = () => {
      setSyncing(true)
      setTimeout(() => setSyncing(false), 1500)
    }

    return (
      <div className="space-y-4 max-w-sm">
        <div className="text-sm font-medium text-muted-foreground">
          כותרת עליונה עם תמונת פרופיל (UserAvatar):
        </div>
        <div className="rounded-2xl border overflow-hidden bg-background shadow-xs">
          <MobileHeader
            fixed={false}
            title="ניהול מערכת"
            titleKey="admin"
            lastSyncedAt="2026-11-13T16:20:00"
            avatarUrl="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces"
            username="דמיטרי טרוסמן"
            action={<SyncButton onClick={handleSync} syncing={syncing} />}
          />
        </div>
      </div>
    )
  },
}

export const MobileHeaderActiveAccount: StoryObj<typeof MobileHeader> = {
  render: function Render() {
    const [syncing, setSyncing] = React.useState(false)
    const handleSync = () => {
      setSyncing(true)
      setTimeout(() => setSyncing(false), 1500)
    }

    return (
      <div className="space-y-4 max-w-sm">
        <div className="text-sm font-medium text-muted-foreground">
          כותרת עליונה כאשר טאב חשבון פעיל (טבעת פעילה סביב האוואטר):
        </div>
        <div className="rounded-2xl border overflow-hidden bg-background shadow-xs">
          <MobileHeader
            fixed={false}
            title="חשבון והגדרות"
            titleKey="account"
            lastSyncedAt="2026-11-13T16:20:00"
            username="מנהל מערכת"
            isAccountActive={true}
            action={<SyncButton onClick={handleSync} syncing={syncing} />}
          />
        </div>
      </div>
    )
  },
}

export const LastSyncedTimestampLabel: StoryObj<typeof LastSyncedLabel> = {
  render: function Render() {
    return (
      <div className="space-y-4 max-w-sm">
        <div className="text-sm font-medium text-muted-foreground">
          רכיב תווית סנכרון אחרון (LastSyncedLabel) והשוואת כותרת עם/בלי שעה:
        </div>
        <div className="p-3 rounded-xl border bg-card flex items-center justify-center">
          <LastSyncedLabel lastSyncedAt="2026-11-13T16:20:00" />
        </div>
        <div className="rounded-2xl border overflow-hidden bg-background shadow-xs">
          <MobileHeader
            fixed={false}
            title="שיעורי בית"
            titleKey="homework-no-sync"
            username="דמיטרי ט."
          />
        </div>
        <div className="rounded-2xl border overflow-hidden bg-background shadow-xs">
          <MobileHeader
            fixed={false}
            title="שיעורי בית"
            titleKey="homework-with-sync"
            lastSyncedAt="2026-11-13T16:20:00"
            username="דמיטרי ט."
            action={<SyncButton onClick={() => {}} />}
          />
        </div>
      </div>
    )
  },
}
