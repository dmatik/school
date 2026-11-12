import type { Meta, StoryObj } from "@storybook/react"
import { DateBadge } from "@/components/ui/date-badge"

const meta: Meta<typeof DateBadge> = {
  title: "3. Badges, Avatars & Pickers/DateBadge",
  component: DateBadge,
  parameters: {
    docs: {
      description: {
        component: "Formatted weekday and date badge component from date-badge.tsx.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof DateBadge>

export const TodayBadge: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="text-sm font-medium text-muted-foreground">תג תאריך של היום:</div>
      <DateBadge date={new Date()} />
    </div>
  ),
}

export const SpecificDateStrings: Story = {
  render: () => (
    <div className="space-y-3">
      <div className="text-sm font-medium text-muted-foreground">תאריכים ספציפיים:</div>
      <div className="flex flex-wrap items-center gap-3">
        <DateBadge date="2026-11-11" />
        <DateBadge date="2026-09-01" />
        <DateBadge date="2026-12-31" />
      </div>
    </div>
  ),
}
