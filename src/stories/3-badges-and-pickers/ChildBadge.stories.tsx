import type { Meta, StoryObj } from "@storybook/react"
import { ChildBadge } from "@/components/ui/child-badge"
import { CHILD_COLORS } from "@/lib/child-colors"

const meta: Meta<typeof ChildBadge> = {
  title: "3. Badges, Avatars & Pickers/ChildBadge",
  component: ChildBadge,
  parameters: {
    docs: {
      description: {
        component: "Child badge supporting all 8 child color schemes, neutral fallback, and both dot indicator (feed cards) and compact solid variants.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof ChildBadge>

export const DotVariantFeedCards: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="text-sm font-medium text-muted-foreground">
        תג שם תלמיד עם נקודת צבע (משמש בכרטיסי שיעורי בית, אירועים ומבחנים):
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {CHILD_COLORS.map((col) => (
          <ChildBadge
            key={col.id}
            name={`תלמיד (${col.id})`}
            colorId={col.id}
            variant="dot"
          />
        ))}
        <ChildBadge name="ללא צבע (ברירת מחדל)" colorId={null} variant="dot" />
      </div>
    </div>
  ),
}

export const CompactSolidVariantSettings: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="text-sm font-medium text-muted-foreground">
        תג מלא קומפקטי (משמש בהגדרות ובשיוך ילדים):
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {CHILD_COLORS.map((col) => (
          <ChildBadge
            key={col.id}
            name={`איתי כהן (${col.id})`}
            colorId={col.id}
            variant="solid"
            size="sm"
          />
        ))}
      </div>
    </div>
  ),
}

export const TruncationExample: Story = {
  render: () => (
    <div className="space-y-2 max-w-xs">
      <div className="text-sm font-medium text-muted-foreground">
        קיטום שמות ארוכים (Truncation):
      </div>
      <ChildBadge
        name="יונתן-אלישע בן-מנחם הגלילי"
        colorId="blue"
        maxTruncateWidth="max-w-[130px]"
      />
    </div>
  ),
}
