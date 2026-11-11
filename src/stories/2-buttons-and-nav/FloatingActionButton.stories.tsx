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
        component: "Floating circular action button (FAB) used in ExamsPage, SchedulePage, and AdminPage, supporting static and toggle states.",
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
        כפתור הוספה צף ראשי (משמש ב-ExamsPage וב-AdminPage):
      </div>
      <div className="flex items-center gap-4">
        <FloatingActionButton
          asFixedOverlay={false}
          icon={Plus}
          title="הוסף מבחן חדש"
          onClick={() => alert("Add clicked")}
        />
        <span className="text-sm font-medium">50px × 50px עגול עם צל מרחף</span>
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
          כפתור מעבר מצב עריכה (משמש ב-SchedulePage):
        </div>
        <div className="flex items-center gap-4">
          <FloatingActionButton
            asFixedOverlay={false}
            icon={Pencil}
            activeIcon={Check}
            active={isEditMode}
            colorClassName={isEditMode ? "bg-emerald-600 text-white" : "bg-primary text-white"}
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

export const ChildColorThemed: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        כפתור צף מותאם לצבע הילד הנבחר במערכת השעות:
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <FloatingActionButton
          asFixedOverlay={false}
          icon={Plus}
          colorClassName="bg-[#3B82C4] text-white"
          title="כחול"
          onClick={() => {}}
        />
        <FloatingActionButton
          asFixedOverlay={false}
          icon={Plus}
          colorClassName="bg-[#2CA58D] text-white"
          title="ירוק אמרלד"
          onClick={() => {}}
        />
        <FloatingActionButton
          asFixedOverlay={false}
          icon={Plus}
          colorClassName="bg-[#8A63B8] text-white"
          title="סגול"
          onClick={() => {}}
        />
        <FloatingActionButton
          asFixedOverlay={false}
          icon={Plus}
          colorClassName="bg-[#D4973B] text-white"
          title="ענבר"
          onClick={() => {}}
        />
        <FloatingActionButton
          asFixedOverlay={false}
          icon={Plus}
          colorClassName="bg-[#C86478] text-white"
          title="ורוד ורד"
          onClick={() => {}}
        />
      </div>
    </div>
  ),
}
