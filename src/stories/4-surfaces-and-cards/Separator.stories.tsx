import type { Meta, StoryObj } from "@storybook/react"
import { Separator } from "@/components/ui/separator"
import { SectionCard, SectionCardSeparator } from "@/components/ui/section-card"
import { Palette } from "lucide-react"

const meta: Meta<typeof Separator> = {
  title: "4. Surfaces & Modals/Separator",
  component: Separator,
  parameters: {
    docs: {
      description: {
        component:
          "Shared visual divider component used across section cards, lists, menus, and layouts with hairline opacity (`bg-border/40 dark:bg-border/60`). Supports horizontal and vertical orientations.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Separator>

export const HorizontalDefault: Story = {
  render: () => (
    <div className="max-w-md space-y-4 p-6 rounded-2xl bg-card border border-border/40">
      <div className="space-y-1">
        <h4 className="text-sm font-medium leading-none">הגדרות מערכת</h4>
        <p className="text-xs text-muted-foreground">ניהול תצורה ושפות</p>
      </div>
      <Separator />
      <div className="text-xs text-muted-foreground">תוכן נוסף לאחר המפריד</div>
    </div>
  ),
}

export const InsideSectionCard: Story = {
  render: () => (
    <div className="max-w-lg space-y-4">
      <SectionCard
        icon={Palette}
        title="תצוגה ושפה"
        description="התאמה אישית של ערכת הנושא ושפת התצוגה"
        contentClassName="pt-2"
      >
        <div className="flex items-center justify-between py-3.5">
          <div className="space-y-0.5">
            <span className="text-sm font-semibold">שפה</span>
            <p className="text-xs text-muted-foreground">בחירת שפת התצוגה המועדפת</p>
          </div>
          <span className="text-xs bg-muted px-2.5 py-1 rounded-md font-medium">עברית</span>
        </div>

        <SectionCardSeparator />

        <div className="flex items-center justify-between py-3.5">
          <div className="space-y-0.5">
            <span className="text-sm font-semibold">ערכת נושא</span>
            <p className="text-xs text-muted-foreground">בחירה בין מצב בהיר, כהה או מערכת</p>
          </div>
          <span className="text-xs bg-muted px-2.5 py-1 rounded-md font-medium">מערכת</span>
        </div>
      </SectionCard>
    </div>
  ),
}

export const VerticalOrientation: Story = {
  render: () => (
    <div className="flex h-8 items-center space-x-4 space-x-reverse text-sm">
      <span className="font-medium">משתמשים</span>
      <Separator orientation="vertical" />
      <span className="text-muted-foreground">הרשאות</span>
      <Separator orientation="vertical" />
      <span className="text-muted-foreground">יומני פעילות</span>
    </div>
  ),
}
