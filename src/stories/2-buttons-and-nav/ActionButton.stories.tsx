import type { Meta, StoryObj } from "@storybook/react"
import { ActionButton, EditButton, DestructiveButton } from "@/components/ui/action-button"
import { Trash2, Edit2, Share2, Download, Copy, ExternalLink } from "lucide-react"

const meta: Meta<typeof ActionButton> = {
  title: "2. Buttons & Navigation/ActionButton",
  component: ActionButton,
  parameters: {
    docs: {
      description: {
        component: "Inline action button component for secondary actions, editing, and destructive triggers. Features ghost styling, subtle hover states, compact density, and natural icon alignment for Hebrew RTL and English LTR.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof ActionButton>

export const WebtopSettingsActions: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-muted-foreground">
        כפתורי פעולה בשימוש בהגדרות Webtop:
      </div>
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/40 shadow-xs max-w-md">
        <EditButton onClick={() => alert("עריכה")} />
        <DestructiveButton onClick={() => alert("נתק חיבור")}>
          נתק חיבור
        </DestructiveButton>
      </div>
    </div>
  ),
}

export const Variants: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-muted-foreground">
        גווני כפתורי פעולה (Action Button Variants):
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ActionButton variant="muted" icon={Edit2}>
          עריכה
        </ActionButton>

        <ActionButton variant="destructive" icon={Trash2}>
          מחיקת פריט
        </ActionButton>

        <ActionButton variant="ghost" icon={Share2}>
          שיתוף
        </ActionButton>

        <ActionButton variant="outline" icon={Download}>
          הורדה
        </ActionButton>
      </div>
    </div>
  ),
}

export const SpecializedButtons: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-muted-foreground">
        כפתורים ייעודיים מוכנים לשימוש (Specialized Action Buttons):
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <EditButton />

        <DestructiveButton>
          מחק משתמש
        </DestructiveButton>

        <DestructiveButton icon={Trash2}>
          הסר תמונה
        </DestructiveButton>

        <ActionButton icon={Copy}>
          העתק קישור
        </ActionButton>

        <ActionButton icon={ExternalLink}>
          פתח בחלון חדש
        </ActionButton>
      </div>
    </div>
  ),
}

export const States: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-muted-foreground">
        מצבי כפתור (פעיל ומושבת):
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <EditButton />
        <EditButton disabled />
        <DestructiveButton>מחק</DestructiveButton>
        <DestructiveButton disabled>מחק מושבת</DestructiveButton>
      </div>
    </div>
  ),
}
