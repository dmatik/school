import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { LiquidTabs } from "@/components/ui/liquid-tabs"

const meta: Meta<typeof LiquidTabs> = {
  title: "2. Buttons & Navigation/LiquidTabs",
  component: LiquidTabs,
  parameters: {
    docs: {
      description: {
        component: "Apple Liquid Glass dock segmented tabs with spring animated active pill, used for child switching and future/past period filtering.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof LiquidTabs>

export const ChildSelectorWithAll: Story = {
  render: function Render() {
    const [selectedId, setSelectedId] = React.useState("all")

    const items = [
      { id: "all", label: "הכל" },
      { id: "child-1", label: "איתי" },
      { id: "child-2", label: "מאיה" },
      { id: "child-3", label: "נועם" },
    ]

    return (
      <div className="space-y-4">
        <div className="text-sm font-medium text-muted-foreground">
          סרגל סינון ילדים (משמש ב-Homework וב-Incidents):
        </div>
        <LiquidTabs
          items={items}
          selectedId={selectedId}
          onSelect={setSelectedId}
          layoutId="storyChildAllPill"
        />
        <div className="text-xs text-muted-foreground">
          נבחר כעת: <span className="font-semibold">{selectedId}</span>
        </div>
      </div>
    )
  },
}

export const SingleChildSelectorNoAll: Story = {
  render: function Render() {
    const [selectedId, setSelectedId] = React.useState("child-1")

    const items = [
      { id: "child-1", label: "איתי כהן" },
      { id: "child-2", label: "מאיה כהן" },
    ]

    return (
      <div className="space-y-4">
        <div className="text-sm font-medium text-muted-foreground">
          סרגל בחירת ילד בודד (משמש ב-SchedulePage):
        </div>
        <LiquidTabs
          items={items}
          selectedId={selectedId}
          onSelect={setSelectedId}
          layoutId="storyChildSinglePill"
        />
      </div>
    )
  },
}

export const PeriodSelectorFuturePast: Story = {
  render: function Render() {
    const [selectedPeriod, setSelectedPeriod] = React.useState("future")

    const items = [
      { id: "future", label: "עתידיים" },
      { id: "past", label: "היסטוריה" },
    ]

    return (
      <div className="space-y-4">
        <div className="text-sm font-medium text-muted-foreground">
          סרגל סינון תקופה עתיד / עבר (משמש ב-ExamsPage):
        </div>
        <LiquidTabs
          items={items}
          selectedId={selectedPeriod}
          onSelect={setSelectedPeriod}
          layoutId="storyPeriodPill"
        />
      </div>
    )
  },
}
