import type { Meta, StoryObj } from "@storybook/react"
import { addDays, subDays } from "date-fns"
import { SectionDateHeader } from "@/components/ui/section-date-header"
import { FeedItemCard } from "@/components/ui/feed-item-card"

const meta: Meta<typeof SectionDateHeader> = {
  title: "4. Surfaces & Modals/SectionDateHeader",
  component: SectionDateHeader,
  parameters: {
    docs: {
      description: {
        component: "Typography-focused section date header used to group timeline feed items across Homework, Incidents, and Exams pages. Automatically formats relative dates (Today, Yesterday, Tomorrow) or localized full weekday dates.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof SectionDateHeader>

export const RelativeDates: Story = {
  render: () => {
    const today = new Date()
    const yesterday = subDays(today, 1)
    const tomorrow = addDays(today, 1)

    return (
      <div className="max-w-md space-y-6">
        <div className="space-y-1 p-3 rounded-xl border bg-card">
          <div className="text-xs text-muted-foreground">היום (Today):</div>
          <SectionDateHeader date={today} />
        </div>

        <div className="space-y-1 p-3 rounded-xl border bg-card">
          <div className="text-xs text-muted-foreground">אתמול (Yesterday):</div>
          <SectionDateHeader date={yesterday} />
        </div>

        <div className="space-y-1 p-3 rounded-xl border bg-card">
          <div className="text-xs text-muted-foreground">מחר (Tomorrow):</div>
          <SectionDateHeader date={tomorrow} />
        </div>
      </div>
    )
  },
}

export const SpecificFormattedDate: Story = {
  render: () => (
    <div className="max-w-md space-y-4">
      <div className="text-sm font-medium text-muted-foreground">
        תאריכים עתידיים או היסטוריים (פורמט מלא של יום בשבוע ותאריך):
      </div>
      <div className="p-3 rounded-xl border bg-card space-y-3">
        <SectionDateHeader date="2026-10-28" />
        <SectionDateHeader date="2026-11-15" />
        <SectionDateHeader date="2026-12-01" />
      </div>
    </div>
  ),
}

export const FeedContext: Story = {
  render: () => {
    const today = new Date()
    const yesterday = subDays(today, 1)

    return (
      <div className="max-w-xl space-y-4">
        <div className="text-sm font-medium text-muted-foreground">
          שילוב כותרת מקטע בפיד אמיתי לצד כרטיסי תוכן (FeedItemCard):
        </div>

        <div className="space-y-2">
          <SectionDateHeader date={today} />
          <div className="space-y-2.5">
            <FeedItemCard
              subject="מתמטיקה"
              title="מתמטיקה"
              subtitle="שיעור 2"
              teacher="רחל לוי"
              childName="איתי"
              childColorId="blue"
              content="עמודים 45-48, תרגילים 1 עד 10."
            />
            <FeedItemCard
              subject="אנגלית"
              title="אנגלית"
              subtitle="שיעור 4"
              teacher="שרה כהן"
              childName="מאיה"
              childColorId="purple"
              content="Read pages 20-22 and answer questions in workbook."
            />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <SectionDateHeader date={yesterday} />
          <div className="space-y-2.5">
            <FeedItemCard
              subject="היסטוריה"
              title="היסטוריה"
              subtitle="שיעור 1"
              teacher="דוד ישראלי"
              childName="איתי"
              childColorId="blue"
              content="סיכום פרק ג' במחברת."
            />
          </div>
        </div>
      </div>
    )
  },
}
