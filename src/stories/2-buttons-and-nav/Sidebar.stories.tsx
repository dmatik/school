import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react"
import {
  AppSidebar,
  type SidebarNavItem,
  BookOpenFull,
  AlertCircleFull,
  CalendarDaysFull,
  SettingsFull,
  FileCheckFull,
} from "@/components/ui/app-sidebar"
import { SyncButton } from "@/components/ui/sync-button"
import {
  BookOpen,
  AlertCircle,
  FileCheck,
  CalendarDays,
  Settings as SettingsIcon,
  Shield,
} from "lucide-react"

const meta: Meta<typeof AppSidebar> = {
  title: "2. Buttons & Navigation/Sidebar",
  component: AppSidebar,
  parameters: {
    docs: {
      description: {
        component: "Desktop application sidebar navigation component with profile header, navigation list, and sync controls.",
      },
    },
  },
}

export default meta

const defaultNavItems: SidebarNavItem[] = [
  { tab: "homework", label: "שיעורי בית", icon: BookOpen, activeIcon: BookOpenFull },
  { tab: "incidents", label: "אירועי משמעת", icon: AlertCircle, activeIcon: AlertCircleFull },
  { tab: "exams", label: "לוח מבחנים", icon: FileCheck, activeIcon: FileCheckFull },
  { tab: "schedule", label: "מערכת שעות", icon: CalendarDays, activeIcon: CalendarDaysFull },
  { tab: "settings", label: "הגדרות", icon: SettingsIcon, activeIcon: SettingsFull },
]

const adminNavItems: SidebarNavItem[] = [
  ...defaultNavItems,
  { tab: "admin", label: "ניהול מערכת", icon: Shield },
]

export const Default: StoryObj<typeof AppSidebar> = {
  render: function Render() {
    const [activeTab, setActiveTab] = React.useState("homework")
    const [syncing, setSyncing] = React.useState(false)
    const [syncSuccess, setSyncSuccess] = React.useState(false)

    const handleSync = () => {
      setSyncing(true)
      setSyncSuccess(false)
      setTimeout(() => {
        setSyncing(false)
        setSyncSuccess(true)
        setTimeout(() => setSyncSuccess(false), 2500)
      }, 1000)
    }

    return (
      <div className="flex gap-8 items-start">
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground">
            תצוגת הורה / תלמיד (User View):
          </div>
          <div className="h-[560px] rounded-2xl border overflow-hidden shadow-xs">
            <AppSidebar
              className="flex w-64 h-full"
              currentUser={{
                username: "dmitryt",
                firstName: "דמיטרי",
                lastName: "ט.",
                avatar: null,
                role: "user",
              }}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              navItems={defaultNavItems}
              syncAction={
                <SyncButton
                  onClick={handleSync}
                  syncing={syncing}
                  success={syncSuccess}
                  summary="סונכרן לאחרונה לפני 5 דקות"
                />
              }
              version="2.4.0"
            />
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card max-w-xs space-y-2 text-sm mt-8">
          <div className="font-semibold text-foreground">טאב נוכחי: {activeTab}</div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            הקלק על טאבים שונים או על תמונת הפרופיל כדי לבדוק מעבר אינטראקטיבי.
            הכפתור בתחתית מאפשר סינכרון ידני ומציג חיווי הצלחה.
          </p>
        </div>
      </div>
    )
  },
}

export const AdminView: StoryObj<typeof AppSidebar> = {
  render: function Render() {
    const [activeTab, setActiveTab] = React.useState("admin")
    const [syncing, setSyncing] = React.useState(false)

    return (
      <div className="space-y-3">
        <div className="text-sm font-medium text-muted-foreground">
          תצוגת מנהל מערכת (Admin View עם לשונית אבטחה):
        </div>
        <div className="h-[580px] rounded-2xl border overflow-hidden shadow-xs inline-block">
          <AppSidebar
            className="flex w-64 h-full"
            currentUser={{
              username: "admin",
              firstName: "מנהל",
              lastName: "מערכת",
              avatar: null,
              role: "admin",
            }}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            navItems={adminNavItems}
            syncAction={
              <SyncButton
                onClick={() => {
                  setSyncing(true)
                  setTimeout(() => setSyncing(false), 800)
                }}
                syncing={syncing}
              />
            }
            version="2.4.0"
          />
        </div>
      </div>
    )
  },
}
