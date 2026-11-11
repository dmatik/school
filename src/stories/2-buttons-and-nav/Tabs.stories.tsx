import type { Meta, StoryObj } from "@storybook/react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

const meta: Meta<typeof Tabs> = {
  title: "2. Buttons & Navigation/Tabs",
  component: Tabs,
  parameters: {
    docs: {
      description: {
        component: "Standard Radix UI Tabs component with accessible keyboard navigation.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Tabs>

export const StandardTabs: Story = {
  render: () => (
    <div className="max-w-md">
      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">סקירה</TabsTrigger>
          <TabsTrigger value="details">פרטים</TabsTrigger>
          <TabsTrigger value="history">היסטוריה</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="p-4 rounded-xl border border-border bg-card mt-2">
          <h4 className="font-semibold text-sm">סקירת ציונים ונוכחות</h4>
          <p className="text-xs text-muted-foreground mt-1">
            כאן מוצגת תמונת המצב הכללית של התלמיד לתקופה הנוכחית.
          </p>
        </TabsContent>
        <TabsContent value="details" className="p-4 rounded-xl border border-border bg-card mt-2">
          <h4 className="font-semibold text-sm">פירוט מקצועות מלא</h4>
          <p className="text-xs text-muted-foreground mt-1">
            רשימת כל המקצועות והשעות השבועיות.
          </p>
        </TabsContent>
        <TabsContent value="history" className="p-4 rounded-xl border border-border bg-card mt-2">
          <h4 className="font-semibold text-sm">היסטוריית אירועים</h4>
          <p className="text-xs text-muted-foreground mt-1">
            ארכיון אירועי משמעת ושיעורי בית קודמים.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  ),
}
