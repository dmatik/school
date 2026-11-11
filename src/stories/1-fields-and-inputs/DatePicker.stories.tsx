import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { DatePicker } from "@/components/ui/date-picker"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"

const meta: Meta<typeof DatePicker> = {
  title: "1. Fields & Inputs/DatePicker",
  component: DatePicker,
  parameters: {
    docs: {
      description: {
        component: "Date picker supporting 3 variants: default form input, liquid glass filter pill, and liquid icon-only button, plus the standalone calendar grid.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof DatePicker>

export const DefaultFormInput: Story = {
  render: function Render() {
    const [date, setDate] = React.useState<Date | undefined>(new Date())
    return (
      <div className="max-w-xs space-y-2">
        <Label>תאריך המבחן (Modal Form)</Label>
        <DatePicker
          date={date}
          setDate={setDate}
          clearable={false}
          formatPattern="dd/MM/yyyy"
          className="bg-muted dark:bg-secondary border-transparent"
        />
      </div>
    )
  },
}

export const LiquidFilterPill: Story = {
  render: function Render() {
    const [date, setDate] = React.useState<Date | undefined>(undefined)
    return (
      <div className="space-y-4">
        <div className="text-sm font-medium text-muted-foreground">
          סינון תאריכים זכוכית נוזלית (Apple Liquid Glass) המשמש ב-Homework וב-Incidents:
        </div>
        <div className="inline-flex items-center p-1 rounded-full apple-liquid-dock">
          <DatePicker
            variant="liquid"
            date={date}
            setDate={setDate}
            placeholder="כל התאריכים"
            clearable={true}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          תאריך נבחר: <span className="font-semibold">{date ? date.toLocaleDateString() : "כל התאריכים"}</span>
        </div>
      </div>
    )
  },
}

export const LiquidIconButton: Story = {
  render: function Render() {
    const [date, setDate] = React.useState<Date | undefined>(undefined)
    return (
      <div className="space-y-4">
        <div className="text-sm font-medium text-muted-foreground">
          כפתור תאריכון אייקון נוזלי (Liquid Icon):
        </div>
        <div className="flex items-center gap-2">
          <DatePicker
            variant="liquid-icon"
            date={date}
            setDate={setDate}
            clearable={true}
          />
          <span className="text-sm">
            {date ? `נבחר: ${date.toLocaleDateString()}` : "לחץ לבחירת תאריך"}
          </span>
        </div>
      </div>
    )
  },
}

export const StandaloneCalendar: Story = {
  render: function Render() {
    const [date, setDate] = React.useState<Date | undefined>(new Date())
    return (
      <div className="inline-block p-2 rounded-2xl border border-border bg-card shadow-sm">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
        />
      </div>
    )
  },
}
