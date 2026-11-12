import type { Meta, StoryObj } from "@storybook/react"
import { ExamCard } from "@/components/ui/exam-card"

const meta: Meta<typeof ExamCard> = {
  title: "4. Surfaces & Modals/ExamCard",
  component: ExamCard,
  parameters: {
    docs: {
      description: {
        component: "Dedicated exam feed card component featuring subject icon badge, exam name, formatted exam date, grade badge with award icon, child color badge, parent edit button, and hairline-divided exam description.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof ExamCard>

export const WithGradeAndDescription: Story = {
  render: () => (
    <div className="max-w-xl space-y-3">
      <ExamCard
        name="מתמטיקה - מבחן מסכם שליש א׳"
        date="2026-11-20"
        grade="95"
        childName="איתי"
        childColorId="blue"
        onEdit={() => {}}
        description="חומר למבחן: שברים פשוטים, בעיות מילוליות והנדסת המישור פרקים א׳-ד׳."
      />
    </div>
  ),
}

export const UpcomingWithoutGrade: Story = {
  render: () => (
    <div className="max-w-xl space-y-3">
      <ExamCard
        name="אנגלית - בחינת אוצר מילים"
        date="2026-12-05"
        childName="מאיה"
        childColorId="emerald"
        onEdit={() => {}}
        description="Unit 3 Vocabulary test: adjectives, regular verbs and short reading comprehension."
      />
    </div>
  ),
}

export const ChildViewNoBadgeOrEdit: Story = {
  render: () => (
    <div className="max-w-xl space-y-3">
      <ExamCard
        name="היסטוריה - מבחן תקופה ראשונה"
        date="2026-11-15"
        grade="88"
        childName={null}
        description="העלייה הראשונה והשנייה, מושבות ודמויות מפתח."
      />
    </div>
  ),
}

export const WithoutDescription: Story = {
  render: () => (
    <div className="max-w-xl space-y-3">
      <ExamCard
        name="מדעים - בוחן מעבדה"
        date="2026-11-10"
        grade="100"
        childName="נועם"
        childColorId="purple"
      />
    </div>
  ),
}
