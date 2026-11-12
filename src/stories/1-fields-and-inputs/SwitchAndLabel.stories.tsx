import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

const meta: Meta<typeof Switch> = {
  title: "1. Fields & Inputs/Switch & Label",
  component: Switch,
  parameters: {
    docs: {
      description: {
        component: "Toggle switch and accessible typography labels with RTL thumb animation.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Switch>

export const InteractiveSwitch: Story = {
  render: function Render() {
    const [checked, setChecked] = React.useState(true)
    return (
      <div className="flex items-center gap-3">
        <Switch id="airplane-mode" checked={checked} onCheckedChange={setChecked} />
        <Label htmlFor="airplane-mode" className="cursor-pointer select-none">
          {checked ? "מופעל (פעיל)" : "כבוי"}
        </Label>
      </div>
    )
  },
}

export const SettingsRowExample: Story = {
  render: function Render() {
    const [notifications, setNotifications] = React.useState(true)
    const [syncDaily, setSyncDaily] = React.useState(false)

    return (
      <div className="max-w-md space-y-4 p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="notif" className="text-sm font-semibold cursor-pointer">
              התראות על אירועים חדשים
            </Label>
            <p className="text-xs text-muted-foreground">
              קבל התראה מידית כשיש אירוע משמעת או שיעורי בית חדשים
            </p>
          </div>
          <Switch id="notif" checked={notifications} onCheckedChange={setNotifications} />
        </div>

        <div className="border-t border-border/50 pt-3 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="sync" className="text-sm font-semibold cursor-pointer">
              סנכרון אוטומטי יומי
            </Label>
            <p className="text-xs text-muted-foreground">
              סנכרן נתונים מול Webtop מדי בוקר
            </p>
          </div>
          <Switch id="sync" checked={syncDaily} onCheckedChange={setSyncDaily} />
        </div>
      </div>
    )
  },
}

export const DisabledStates: Story = {
  render: () => (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Switch disabled checked={true} />
        <Label className="opacity-70">מופעל אך נעול (Disabled On)</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch disabled checked={false} />
        <Label className="opacity-70">כבוי ונעול (Disabled Off)</Label>
      </div>
    </div>
  ),
}
