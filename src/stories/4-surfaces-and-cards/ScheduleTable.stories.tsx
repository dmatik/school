import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react"
import {
  ScheduleTable,
  type ScheduleTableProps,
  type ScheduleTableLesson,
  type ScheduleTableFinishTime,
} from "@/components/ui/schedule-table"

const sampleLessons: ScheduleTableLesson[] = [
  // Sunday
  { dayOfWeek: 0, hourNum: 1, subject: "מתמטיקה" },
  { dayOfWeek: 0, hourNum: 2, subject: "מתמטיקה" },
  { dayOfWeek: 0, hourNum: 3, subject: "אנגלית" },
  { dayOfWeek: 0, hourNum: 4, subject: "תנ״ך" },
  { dayOfWeek: 0, hourNum: 5, subject: "חינוך גופני" },
  // Monday
  { dayOfWeek: 1, hourNum: 1, subject: "עברית" },
  { dayOfWeek: 1, hourNum: 2, subject: "מדעים" },
  { dayOfWeek: 1, hourNum: 3, subject: "מדעים" },
  { dayOfWeek: 1, hourNum: 4, subject: "היסטוריה" },
  { dayOfWeek: 1, hourNum: 5, subject: "אומנות" },
  { dayOfWeek: 1, hourNum: 6, subject: "מוזיקה" },
  // Tuesday
  { dayOfWeek: 2, hourNum: 1, subject: "אנגלית" },
  { dayOfWeek: 2, hourNum: 2, subject: "מתמטיקה" },
  { dayOfWeek: 2, hourNum: 3, subject: "גאוגרפיה" },
  { dayOfWeek: 2, hourNum: 4, subject: "כישורי חיים" },
  // Wednesday
  { dayOfWeek: 3, hourNum: 1, subject: "מחשבים" },
  { dayOfWeek: 3, hourNum: 2, subject: "מחשבים" },
  { dayOfWeek: 3, hourNum: 3, subject: "עברית" },
  { dayOfWeek: 3, hourNum: 4, subject: "מתמטיקה" },
  { dayOfWeek: 3, hourNum: 5, subject: "דרמה" },
  // Thursday
  { dayOfWeek: 4, hourNum: 1, subject: "מדעים" },
  { dayOfWeek: 4, hourNum: 2, subject: "תנ״ך" },
  { dayOfWeek: 4, hourNum: 3, subject: "אנגלית" },
  { dayOfWeek: 4, hourNum: 4, subject: "חינוך גופני" },
  { dayOfWeek: 4, hourNum: 5, subject: "פרטני" },
  // Friday
  { dayOfWeek: 5, hourNum: 1, subject: "עברית" },
  { dayOfWeek: 5, hourNum: 2, subject: "מתמטיקה" },
  { dayOfWeek: 5, hourNum: 3, subject: "שיחת כיתה" },
]

const sampleFinishTimes: ScheduleTableFinishTime[] = [
  { dayOfWeek: 0, finishTime: "13:30" },
  { dayOfWeek: 1, finishTime: "14:15" },
  { dayOfWeek: 2, finishTime: "12:45" },
  { dayOfWeek: 3, finishTime: "13:30" },
  { dayOfWeek: 4, finishTime: "13:30" },
  { dayOfWeek: 5, finishTime: "11:45" },
]

const meta: Meta<typeof ScheduleTable> = {
  title: "4. Surfaces & Modals/ScheduleTable",
  component: ScheduleTable,
  parameters: {
    docs: {
      description: {
        component:
          "Weekly class schedule grid (Sunday–Friday) used on the Schedule page. Features a frozen hour column, child-colored header row with a 'Today' badge, line-clamped lesson subjects, a dismissal finish-time row, edit-mode add/edit affordances, and a horizontally snap-scrolling 3-day view on mobile with prev/next controls.",
      },
    },
  },
  args: {
    lessons: sampleLessons,
    finishTimes: sampleFinishTimes,
    childColorId: "blue",
    currentDayOfWeek: 1,
    isEditMode: false,
    canEdit: false,
  },
  argTypes: {
    childColorId: {
      control: "select",
      options: ["blue", "emerald", "purple", "amber", "rose", "cyan", "orange", "indigo", null],
    },
    currentDayOfWeek: { control: { type: "number", min: 0, max: 6 } },
  },
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof ScheduleTable>

export const ViewMode: Story = {}

export const EditMode: Story = {
  args: {
    isEditMode: true,
    canEdit: true,
  },
}

export const DifferentChildColor: Story = {
  args: {
    childColorId: "rose",
    currentDayOfWeek: 3,
  },
}

export const DefaultPrimaryColor: Story = {
  args: {
    childColorId: null,
  },
}

export const Saturday_NoTodayHighlight: Story = {
  args: {
    currentDayOfWeek: 6,
  },
}

export const EmptyScheduleEditMode: Story = {
  args: {
    lessons: [],
    finishTimes: [],
    isEditMode: true,
    canEdit: true,
  },
}

export const LongSubjectNames: Story = {
  args: {
    lessons: [
      { dayOfWeek: 0, hourNum: 1, subject: "מדעים וטכנולוגיה – מעבדה מתקדמת" },
      { dayOfWeek: 1, hourNum: 1, subject: "Advanced English Literature & Composition" },
      { dayOfWeek: 2, hourNum: 1, subject: "כישורי חיים ומפגש חברתי" },
      { dayOfWeek: 3, hourNum: 2, subject: "מתמטיקה" },
    ],
  },
}

function InteractiveScheduleDemo(args: ScheduleTableProps) {
  const [lessons, setLessons] = useState<ScheduleTableLesson[]>(sampleLessons)
  const [isEditMode, setIsEditMode] = useState(true)
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsEditMode((v) => !v)}
        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground"
      >
        {isEditMode ? "סיום עריכה" : "עריכה"}
      </button>
      <ScheduleTable
        {...args}
        lessons={lessons}
        isEditMode={isEditMode}
        canEdit={isEditMode}
        onLessonClick={(dayOfWeek, hourNum) => {
          const existing = lessons.find((l) => l.dayOfWeek === dayOfWeek && l.hourNum === hourNum)
          const subject = window.prompt("מקצוע", existing?.subject ?? "")
          if (subject === null) return
          setLessons((prev) => {
            const rest = prev.filter((l) => !(l.dayOfWeek === dayOfWeek && l.hourNum === hourNum))
            return subject.trim() ? [...rest, { dayOfWeek, hourNum, subject: subject.trim() }] : rest
          })
        }}
      />
    </div>
  )
}

export const InteractiveEditing: Story = {
  render: (args) => <InteractiveScheduleDemo {...args} />,
}
