import type { Meta, StoryObj } from "@storybook/react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const meta: Meta<typeof Card> = {
  title: "4. Surfaces & Modals/Card",
  component: Card,
  parameters: {
    docs: {
      description: {
        component:
          "Low-level surface card primitive composed of Card, CardHeader, CardTitle, CardDescription, CardContent, and CardFooter. Styled with rounded-xl, bg-card, and subtle shadow-xs.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Card>

export const StandardCard: Story = {
  render: () => (
    <div className="max-w-md p-4">
      <Card>
        <CardHeader>
          <CardTitle>כותרת הכרטיס</CardTitle>
          <CardDescription>תיאור קצר של תוכן הכרטיס והפעולות הזמינות בו.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">
            תוכן הכרטיס המרכזי עם נתונים וטקסט נוסף.
          </p>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline" size="sm">ביטול</Button>
          <Button size="sm">שמור שינויים</Button>
        </CardFooter>
      </Card>
    </div>
  ),
}

export const BorderedVariant: Story = {
  render: () => (
    <div className="max-w-md p-4">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>כרטיס מתוחם</CardTitle>
          <CardDescription>כרטיס עם מסגרת מוגדרת border-border/60</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            מתאים לשימוש כאשר הרקע בהיר או כאשר נדרשת הפרדה חזותית ברורה.
          </p>
        </CardContent>
      </Card>
    </div>
  ),
}
