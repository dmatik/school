import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { FloatingActionButton } from "@/components/ui/floating-action-button"
import { Plus, Pencil, Check } from "lucide-react"

const meta: Meta<typeof FloatingActionButton> = {
  title: "2. Buttons & Navigation/FloatingActionButton",
  component: FloatingActionButton,
  parameters: {
    docs: {
      description: {
        component: "Floating circular action button (FAB) styled with Apple Liquid Glass (`apple-liquid-dock`) used in ExamsPage, SchedulePage, and AdminPage, supporting static and toggle states.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof FloatingActionButton>

export const PrimaryAddButton: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        כפתור הוספה צף ראשי בסגנון זכוכית נוזלית (משמש ב-ExamsPage וב-AdminPage):
      </div>
      <div className="flex items-center gap-4">
        <FloatingActionButton
          asFixedOverlay={false}
          icon={Plus}
          title="הוסף מבחן חדש"
          onClick={() => alert("Add clicked")}
        />
        <span className="text-sm font-medium">50px × 50px עגול בסגנון Apple Liquid Glass</span>
      </div>
    </div>
  ),
}

export const EditModeToggleSchedule: Story = {
  render: function Render() {
    const [isEditMode, setIsEditMode] = React.useState(false)

    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          כפתור מעבר מצב עריכה בסגנון זכוכית נוזלית (משמש ב-SchedulePage):
        </div>
        <div className="flex items-center gap-4">
          <FloatingActionButton
            asFixedOverlay={false}
            icon={Pencil}
            activeIcon={Check}
            active={isEditMode}
            title={isEditMode ? "סיום עריכה" : "הפעל מצב עריכה"}
            onClick={() => setIsEditMode((prev) => !prev)}
          />
          <div className="text-sm font-medium">
            מצב נוכחי: <span className="font-bold">{isEditMode ? "עריכה פעילה (Check)" : "צפייה (Pencil)"}</span>
          </div>
        </div>
      </div>
    )
  },
}
