import type { Meta, StoryObj } from "@storybook/react"
import { StatusBadge } from "@/components/ui/status-badge"

const meta: Meta<typeof StatusBadge> = {
  title: "3. Badges, Avatars & Pickers/StatusBadge",
  component: StatusBadge,
  parameters: {
    docs: {
      description: {
        component: "Semantic status pills for system roles, connection status, grades, and indicators.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof StatusBadge>

export const AllStatusVariants: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground">סטטוס חיבור וסנכרון Webtop:</h4>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge variant="success" label="מחובר ומסונכרן" />
          <StatusBadge variant="neutral" label="לא מחובר ל-Webtop" />
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground">ציוני מבחנים:</h4>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge variant="grade" label="ציון: 100" />
          <StatusBadge variant="grade" label="ציון: 95" />
          <StatusBadge variant="grade" label="ציון: 88" />
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground">תפקידי מערכת (Admin vs. User):</h4>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge variant="admin" label="מנהל מערכת (Admin)" />
          <StatusBadge variant="user" label="משתמש רגיל (User)" />
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground">תפקידי משפחה (Parent vs. Child):</h4>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge variant="parent" label="הורה (Parent)" />
          <StatusBadge variant="child" label="ילד / תלמיד (Child)" />
        </div>
      </div>
    </div>
  ),
}
