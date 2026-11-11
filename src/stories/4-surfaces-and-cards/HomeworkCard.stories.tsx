import type { Meta, StoryObj } from "@storybook/react"
import { HomeworkCard } from "@/components/ui/homework-card"

const meta: Meta<typeof HomeworkCard> = {
  title: "4. Surfaces & Modals/HomeworkCard",
  component: HomeworkCard,
  parameters: {
    docs: {
      description: {
        component: "Dedicated homework feed card component featuring subject icon badge, lesson hour formatting, teacher name, child color badge, and homework content with hairline divider.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof HomeworkCard>

export const SingleLesson: Story = {
  render: () => (
    <div className="max-w-xl space-y-3">
      <HomeworkCard
        subject="מתמטיקה"
        lessonHour={2}
        teacher="רחל לוי"
        childName="איתי"
        childColorId="blue"
        homeworkText="עמודים 72-74 תרגילים 1 עד 15. לחזור על לוח הכפל של 8 ו-9."
      />
    </div>
  ),
}

export const MultipleMergedHours: Story = {
  render: () => (
    <div className="max-w-xl space-y-3">
      <HomeworkCard
        subject="אנגלית"
        lessonHours={[3, 4]}
        teacher="שרה כהן"
        childName="מאיה"
        childColorId="purple"
        homeworkText="Read pages 45-50 in the Reader and complete activities 1-4 in the workbook."
      />
    </div>
  ),
}

export const ChildViewNoBadge: Story = {
  render: () => (
    <div className="max-w-xl space-y-3">
      <HomeworkCard
        subject="היסטוריה"
        lessonHour={1}
        teacher="יוסי אברהם"
        childName={null}
        homeworkText="קריאת פרק ד' בספר הלימוד ומענה על שאלות 1-3 במחברת."
      />
    </div>
  ),
}

export const WithoutTeacher: Story = {
  render: () => (
    <div className="max-w-xl space-y-3">
      <HomeworkCard
        subject="מדעים"
        lessonHour={5}
        childName="נועם"
        childColorId="emerald"
        homeworkText="הכנת דגם תא צמחי לקראת השיעור הבא."
      />
    </div>
  ),
}
