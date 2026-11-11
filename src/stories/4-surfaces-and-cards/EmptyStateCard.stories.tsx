import type { Meta, StoryObj } from "@storybook/react"
import { EmptyStateCard } from "@/components/ui/empty-state-card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, BookOpen, GraduationCap, CalendarDays, AlertCircle } from "lucide-react"

const meta: Meta<typeof EmptyStateCard> = {
  title: "4. Surfaces & Modals/EmptyStateCard",
  component: EmptyStateCard,
  parameters: {
    docs: {
      description: {
        component: "Dashed border empty state card used across pages for 'all clear', 'no matches', and integration onboarding.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof EmptyStateCard>

export const AllClearIncidents: Story = {
  render: () => (
    <EmptyStateCard
      icon={CheckCircle2}
      title="אין אירועי משמעת"
      description="כל הכבוד! אין דיווחים או אירועים עבור התאריך שנבחר."
    />
  ),
}

export const NoHomeworkForDate: Story = {
  render: () => (
    <EmptyStateCard
      icon={BookOpen}
      iconClassName="bg-[#555DB0]/15 text-[#555DB0] dark:bg-[#555DB0]/25 dark:text-[#C5C8F5]"
      title="אין שיעורי בית ליום זה"
      description="נראה שאין מטלות המיועדות ליום שנבחר."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs h-8">
            חזור להיום
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-8">
            כל התאריכים
          </Button>
        </div>
      }
    />
  ),
}

export const WebtopNotConfiguredOnboarding: Story = {
  render: () => (
    <EmptyStateCard
      variant="onboarding"
      icon={GraduationCap}
      iconClassName="bg-[#D4973B]/15 text-[#D4973B] dark:bg-[#D4973B]/25 dark:text-[#F5D59E]"
      title="ברוכים הבאים למערכת בית הספר"
      description="כדי לצפות באירועים, שיעורי בית ומערכת שעות, יש להתחבר לחשבון Webtop."
      onboardingNotice={
        <div className="rounded-xl bg-muted/60 p-4 border border-border flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary mt-0.5 shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="space-y-1 text-start">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-foreground">
                סטטוס אינטגרציה
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#3B82C4]/15 text-[#3B82C4] dark:bg-[#3B82C4]/25 dark:text-[#AED4F8]">
                Webtop
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              היכנס למסך ההגדרות והזן את פרטי ההתחברות שלך למשו״ב / Webtop לביצוע סנכרון ראשוני.
            </p>
          </div>
        </div>
      }
      actions={
        <Button size="sm" className="rounded-full">
          עבור להגדרות התחברות
        </Button>
      }
    />
  ),
}

export const UnlinkedChildNotice: Story = {
  render: () => (
    <EmptyStateCard
      icon={CalendarDays}
      iconClassName="bg-[#D4973B]/15 text-[#D4973B] dark:bg-[#D4973B]/25 dark:text-[#F5D59E]"
      title="חשבון תלמיד לא מקושר"
      description="משתמש זה מוגדר כתלמיד אך טרם קושר לתלמיד ספציפי ב-Webtop. פנה להורה המנהל לצורך שיוך."
    />
  ),
}
