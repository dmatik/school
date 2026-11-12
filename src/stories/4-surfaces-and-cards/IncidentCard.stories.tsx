import type { Meta, StoryObj } from "@storybook/react"
import { IncidentCard } from "@/components/ui/incident-card"

const meta: Meta<typeof IncidentCard> = {
  title: "4. Surfaces & Modals/IncidentCard",
  component: IncidentCard,
  parameters: {
    docs: {
      description: {
        component: "Dedicated incident feed card component featuring subject or incident-type icon badge, lesson hour formatting, teacher name, child color badge, and hairline-divided incident description.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof IncidentCard>

export const WithSubjectAndDescription: Story = {
  render: () => (
    <div className="max-w-xl space-y-3">
      <IncidentCard
        subject="מדעים"
        type="אי הכנת שיעורי בית"
        hourNum={4}
        teacher="יוסי אברהם"
        childName="מאיה"
        childColorId="emerald"
        description="לא הגישה את דוח הניסוי בנושא מערכת השמש שנקבע להיום."
      />
    </div>
  ),
}

export const WithoutSubject: Story = {
  render: () => (
    <div className="max-w-xl space-y-3">
      <IncidentCard
        type="איחור לשיעור"
        hourNum={1}
        teacher="שרה ישראלי"
        childName="איתי"
        childColorId="blue"
        description="נכנס לכיתה 15 דקות לאחר הצלצול ללא אישור."
      />
    </div>
  ),
}

export const PositiveReinforcement: Story = {
  render: () => (
    <div className="max-w-xl space-y-3">
      <IncidentCard
        subject="חינוך גופני"
        type="חיזוק חיובי"
        hourNum={3}
        teacher="דני שגיא"
        childName="נועם"
        childColorId="purple"
        description="הצטיינות בריצת 60 מטר ועזרה ושיתוף פעולה עם תלמידים אחרים."
      />
    </div>
  ),
}

export const ChildViewNoBadge: Story = {
  render: () => (
    <div className="max-w-xl space-y-3">
      <IncidentCard
        subject="אנגלית"
        type="הפרעה"
        hourNum={2}
        teacher="רחל לוי"
        childName={null}
        description="דיבור ללא רשות במהלך השיעור."
      />
    </div>
  ),
}

export const WithoutTeacher: Story = {
  render: () => (
    <div className="max-w-xl space-y-3">
      <IncidentCard
        subject="תנ״ך"
        type="אי הבאת ציוד"
        hourNum={5}
        childName="איתי"
        childColorId="blue"
        description="ללא ספר תנ״ך ומחברת לימוד."
      />
    </div>
  ),
}
