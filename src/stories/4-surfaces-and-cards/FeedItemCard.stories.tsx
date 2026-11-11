import type { Meta, StoryObj } from "@storybook/react"
import { FeedItemCard } from "@/components/ui/feed-item-card"
import { Button } from "@/components/ui/button"
import { Edit2, Award, Calendar } from "lucide-react"

const meta: Meta<typeof FeedItemCard> = {
  title: "4. Surfaces & Modals/FeedItemCard",
  component: FeedItemCard,
  parameters: {
    docs: {
      description: {
        component: "Consolidated feed item card shell used across Homework, Incidents, and Exams pages, featuring responsive title, subtitle, subject icon, child badge, teacher line, and hairline divider.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof FeedItemCard>

export const HomeworkItemCard: Story = {
  render: () => (
    <div className="max-w-xl space-y-3">
      <FeedItemCard
        subject="מתמטיקה"
        title="מתמטיקה"
        subtitle="שיעור 2, 3"
        teacher="רחל לוי"
        childName="איתי"
        childColorId="blue"
        content={
          <div>
            <span className="font-semibold me-1.5">שיעורי בית:</span>
            <span>עמודים 72-74 תרגילים 1 עד 15. לחזור על לוח הכפל של 8 ו-9.</span>
          </div>
        }
      />
    </div>
  ),
}

export const IncidentItemCard: Story = {
  render: () => (
    <div className="max-w-xl space-y-3">
      <FeedItemCard
        subject="מדעים"
        title="מדעים"
        subtitle="שיעור 4"
        teacher="יוסי אברהם"
        childName="מאיה"
        childColorId="emerald"
        content={
          <div>
            <span className="font-semibold me-1.5">אי הכנת שיעורי בית:</span>
            <span>לא הגישה את דוח הניסוי בנושא מערכת השמש שנקבע להיום.</span>
          </div>
        }
      />
    </div>
  ),
}

export const ExamItemCard: Story = {
  render: () => (
    <div className="max-w-xl space-y-3">
      <FeedItemCard
        subject="אנגלית"
        title="אנגלית - בחינת אוצר מילים"
        subtitle={
          <div className="flex items-center gap-2 mt-0.5">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              18/11/2026
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[#555DB0]/15 text-[#555DB0] dark:bg-[#555DB0]/25 dark:text-[#C5C8F5]">
              <Award className="w-3 h-3 shrink-0" />
              ציון: 94
            </span>
          </div>
        }
        childName="איתי"
        childColorId="blue"
        actions={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
            title="ערוך מבחן"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        }
        content={
          <div>Unit 3 Vocabulary test: adjectives, regular verbs and short reading comprehension.</div>
        }
      />
    </div>
  ),
}

export const SideBySideComparison: Story = {
  render: () => (
    <div className="max-w-xl space-y-4">
      <div className="text-sm font-semibold text-muted-foreground">
        שלושת כרטיסי הפיד מוצגים זה לצד זה עם אותו מבנה מדויק:
      </div>
      <FeedItemCard
        subject="תנך"
        title="תנ״ך"
        subtitle="שיעור 1"
        teacher="שרה ישראלי"
        childName="איתי"
        childColorId="blue"
        content="שמות פרק ב' פסוקים א'-י': קריאה וכתיבת סיכום במחברת."
      />
      <FeedItemCard
        subject="חינוך גופני"
        title="חינוך גופני"
        subtitle="שיעור 5"
        teacher="דני שגיא"
        childName="נועם"
        childColorId="purple"
        content="חיזוק חיובי: הצטיינות בריצת 60 מטר ושיתוף פעולה קבוצתי."
      />
      <FeedItemCard
        subject="היסטוריה"
        title="היסטוריה - מבחן מסכם תקופה א'"
        subtitle="תאריך: 25/11/2026"
        childName="מאיה"
        childColorId="emerald"
        content="פרקים 4 עד 7: העלייה הראשונה והשנייה, מושבות ודמויות מרכזיות."
      />
    </div>
  ),
}
