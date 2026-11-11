import type { Meta, StoryObj } from "@storybook/react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const meta: Meta<typeof Select> = {
  title: "1. Fields & Inputs/Select",
  component: Select,
  parameters: {
    docs: {
      description: {
        component: "Radix UI Select component with support for card vs. filled modal backgrounds, RTL alignment, and groups.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Select>

export const CardSelect: Story = {
  render: () => (
    <div className="max-w-xs space-y-2">
      <Label>בחירת נושא (Card Variant)</Label>
      <Select defaultValue="homework">
        <SelectTrigger>
          <SelectValue placeholder="בחר אפשרות..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="homework">שיעורי בית</SelectItem>
          <SelectItem value="incidents">אירועי משמעת</SelectItem>
          <SelectItem value="exams">לוח מבחנים</SelectItem>
          <SelectItem value="schedule">מערכת שעות</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
}

export const FilledModalSelect: Story = {
  render: () => (
    <div className="max-w-xs space-y-2">
      <Label>בחירת ילד (Modal / Filled)</Label>
      <Select defaultValue="child-1">
        <SelectTrigger className="bg-muted dark:bg-secondary border-transparent">
          <SelectValue placeholder="בחר ילד..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="child-1">איתי כהן (כיתה ד'2)</SelectItem>
          <SelectItem value="child-2">מאיה כהן (כיתה א'1)</SelectItem>
          <SelectItem value="child-3">נועם כהן (כיתה ז'3)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
}

export const RoleSelectorWithGroup: Story = {
  render: () => (
    <div className="max-w-xs space-y-2">
      <Label>תפקיד במערכת (Admin View)</Label>
      <Select defaultValue="parent">
        <SelectTrigger className="bg-muted dark:bg-secondary border-transparent">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>תפקיד משפחתי</SelectLabel>
            <SelectItem value="parent">הורה (Parent)</SelectItem>
            <SelectItem value="child">ילד / תלמיד (Child)</SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>הרשאות מערכת</SelectLabel>
            <SelectItem value="admin">מנהל מערכת (Admin)</SelectItem>
            <SelectItem value="user">משתמש רגיל (User)</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div className="max-w-xs space-y-2">
      <Label>תפקיד נעול</Label>
      <Select defaultValue="admin" disabled>
        <SelectTrigger className="bg-muted dark:bg-secondary border-transparent" disabled>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">מנהל ראשי (לא ניתן לשינוי)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
}
