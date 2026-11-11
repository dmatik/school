import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { LiquidDock, type DockItem } from "@/components/ui/liquid-dock"
import {
  BookOpenFull,
  AlertCircleFull,
  FileCheckFull,
  CalendarDaysFull,
  SettingsFull,
} from "@/components/ui/nav-icons"
import {
  BookOpen,
  AlertCircle,
  FileCheck,
  CalendarDays,
  Settings as SettingsIcon,
  Shield,
} from "lucide-react"

const meta: Meta<typeof LiquidDock> = {
  title: "2. Buttons & Navigation/Liquid Dock",
  component: LiquidDock,
  parameters: {
    docs: {
      description: {
        component: "Floating frosted liquid glass mobile dock navigation bar with animated spring pill indicator and horizontal overflow scrolling.",
      },
    },
  },
}

export default meta

const defaultItems: DockItem[] = [
  { tab: "homework", label: "שיעורים", icon: BookOpen, activeIcon: BookOpenFull },
  { tab: "incidents", label: "אירועים", icon: AlertCircle, activeIcon: AlertCircleFull },
  { tab: "exams", label: "מבחנים", icon: FileCheck, activeIcon: FileCheckFull },
  { tab: "schedule", label: "מערכת", icon: CalendarDays, activeIcon: CalendarDaysFull },
  { tab: "settings", label: "הגדרות", icon: SettingsIcon, activeIcon: SettingsFull },
]

const adminItems: DockItem[] = [
  ...defaultItems,
  { tab: "admin", label: "ניהול", icon: Shield },
]

export const Default: StoryObj<typeof LiquidDock> = {
  render: function Render() {
    const [activeTab, setActiveTab] = React.useState("homework")

    return (
      <div className="space-y-6 max-w-md">
        <div className="text-sm font-medium text-muted-foreground">
          סרגל ניווט תחתון צף רגיל (תצוגת 5 טאבים עם קפסולת Liquid Glass זורמת):
        </div>

        <div className="relative h-44 rounded-3xl border bg-background/80 flex items-center justify-center p-4 overflow-hidden shadow-xs">
          <LiquidDock
            floating={false}
            items={defaultItems}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        <div className="text-xs text-muted-foreground">
          טאב נבחר: <span className="font-semibold text-foreground">{activeTab}</span>
        </div>
      </div>
    )
  },
}

export const WithBadge: StoryObj<typeof LiquidDock> = {
  render: function Render() {
    const [activeTab, setActiveTab] = React.useState("incidents")

    const itemsWithBadge: DockItem[] = [
      { tab: "homework", label: "שיעורים", icon: BookOpen, activeIcon: BookOpenFull },
      {
        tab: "incidents",
        label: "אירועים",
        icon: AlertCircle,
        activeIcon: AlertCircleFull,
        badge: (
          <span className="flex h-3.5 min-w-3.5 px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs">
            2
          </span>
        ),
      },
      { tab: "exams", label: "מבחנים", icon: FileCheck, activeIcon: FileCheckFull },
      { tab: "schedule", label: "מערכת", icon: CalendarDays, activeIcon: CalendarDaysFull },
      { tab: "settings", label: "הגדרות", icon: SettingsIcon, activeIcon: SettingsFull },
    ]

    return (
      <div className="space-y-6 max-w-md">
        <div className="text-sm font-medium text-muted-foreground">
          תצוגת תג התראות (Notification Badge):
        </div>

        <div className="relative h-44 rounded-3xl border bg-background/80 flex items-center justify-center p-4 overflow-hidden shadow-xs">
          <LiquidDock
            floating={false}
            items={itemsWithBadge}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      </div>
    )
  },
}

export const AdminOverflow: StoryObj<typeof LiquidDock> = {
  render: function Render() {
    const [activeTab, setActiveTab] = React.useState("admin")

    return (
      <div className="space-y-6 max-w-md">
        <div className="text-sm font-medium text-muted-foreground">
          תצוגת 6 טאבים למנהל עם גלילה אופקית (Admin View עם רוחב מותאם וגלילה חלקה):
        </div>

        <div className="relative h-44 rounded-3xl border bg-background/80 flex items-center justify-center p-4 overflow-hidden shadow-xs">
          <LiquidDock
            floating={false}
            items={adminItems}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        <div className="text-xs text-muted-foreground">
          טאב נבחר: <span className="font-semibold text-foreground">{activeTab}</span>
        </div>
      </div>
    )
  },
}
