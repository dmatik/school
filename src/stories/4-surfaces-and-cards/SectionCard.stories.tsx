import type { Meta, StoryObj } from "@storybook/react"
import { Palette, GraduationCap, Key, CheckCircle2, Globe, Plus, Users } from "lucide-react"
import {
  SectionCard,
  SectionCardHeader,
  SectionCardTitle,
  SectionCardDescription,
  SectionCardContent,
} from "@/components/ui/section-card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { AdminUserRow } from "@/components/ui/admin-user-row"

const meta: Meta<typeof SectionCard> = {
  title: "4. Surfaces & Modals/SectionCard",
  component: SectionCard,
  parameters: {
    docs: {
      description: {
        component:
          "Reusable section card component with unified container styling matching HomeworkCard, IncidentCard, and ExamCard. Supports icon, title, description, header action slot, and flexible body content.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof SectionCard>

export const AppearanceSection: Story = {
  render: () => (
    <div className="max-w-xl space-y-4">
      <SectionCard
        icon={Palette}
        title="תצוגה ושפה"
        description="התאם אישית את שפת הממשק ומצב התצוגה של המערכת"
        contentClassName="pt-2 divide-y divide-border/40"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-3.5">
          <div className="space-y-0.5">
            <span className="text-sm font-semibold text-foreground block">שפת ממשק</span>
            <span className="text-xs text-muted-foreground block">בחר את שפת התצוגה המועדפת</span>
          </div>
          <div className="w-full sm:w-[160px] shrink-0">
            <Select defaultValue="he">
              <SelectTrigger className="w-full bg-muted dark:bg-secondary border-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="he">עברית</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-3.5">
          <div className="space-y-0.5">
            <span className="text-sm font-semibold text-foreground block">ערכת נושא</span>
            <span className="text-xs text-muted-foreground block">בחר בין מצב בהיר, כהה או לפי הגדרות המערכת</span>
          </div>
          <div className="w-full sm:w-[160px] shrink-0">
            <Select defaultValue="system">
              <SelectTrigger className="w-full bg-muted dark:bg-secondary border-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">בהיר</SelectItem>
                <SelectItem value="dark">כהה</SelectItem>
                <SelectItem value="system">מערכת</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>
    </div>
  ),
}

export const WebtopConnected: Story = {
  render: () => (
    <div className="max-w-xl space-y-4">
      <SectionCard
        icon={GraduationCap}
        title="חיבור למערכת Webtop"
        description="סנכרון אוטומטי של מערכת שעות, שיעורי בית, אירועי משמעת וציונים"
        action={
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#2CA58D]/15 text-[#2CA58D] dark:bg-[#2CA58D]/25 dark:text-[#9EE8D8] border border-transparent">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>מחובר</span>
          </div>
        }
      >
        <div className="p-3.5 rounded-xl bg-muted/40 dark:bg-secondary/80 border border-transparent text-sm">
          פרטי משתמש Webtop וסנכרון אחרון
        </div>
      </SectionCard>
    </div>
  ),
}

export const WebtopDisconnected: Story = {
  render: () => (
    <div className="max-w-xl space-y-4">
      <SectionCard
        icon={GraduationCap}
        title="חיבור למערכת Webtop"
        description="סנכרון אוטומטי של מערכת שעות, שיעורי בית, אירועי משמעת וציונים"
        action={
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-transparent">
            <Globe className="w-3.5 h-3.5" />
            <span>לא מחובר</span>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">הזן פרטי התחברות כדי להתחיל בסנכרון.</p>
      </SectionCard>
    </div>
  ),
}

export const WithHeaderAction: Story = {
  render: () => (
    <div className="max-w-xl space-y-4">
      <SectionCard
        icon={Key}
        title="מפתחות גישה (Passkeys)"
        description="התחברות מאובטחת ומהירה באמצעות זיהוי פנים או טביעת אצבע"
        action={
          <Button size="sm" variant="outline" className="text-xs">
            <Plus className="w-3.5 h-3.5 me-1" />
            הוסף מפתח
          </Button>
        }
      >
        <div className="text-sm text-muted-foreground">
          רשימת מפתחות רשומים במכשיר הנוכחי.
        </div>
      </SectionCard>
    </div>
  ),
}

export const AdminUsersSection: Story = {
  render: () => (
    <div className="max-w-xl space-y-4">
      <SectionCard
        icon={Users}
        title="משתמשי מערכת"
        description="סה״כ: 3 משתמשים"
        contentClassName="pt-1"
      >
        <AdminUserRow
          user={{
            id: "admin-1",
            username: "admin",
            firstName: "מנהל",
            lastName: "מערכת",
            role: "admin",
            familyRole: "parent",
          }}
          isSelf
          onEdit={() => {}}
          onResetPassword={() => {}}
        />

        <Separator className="my-0" />

        <AdminUserRow
          user={{
            id: "user-2",
            username: "ronen",
            firstName: "רונן",
            lastName: "טרוסמן",
            role: "user",
            familyRole: "child",
            linkedChildId: "child-1",
          }}
          linkedChild={{
            id: "child-1",
            name: "רונן טרוסמן",
            color: "blue",
          }}
          onEdit={() => {}}
          onResetPassword={() => {}}
          onDelete={() => {}}
        />

        <Separator className="my-0" />

        <AdminUserRow
          user={{
            id: "user-3",
            username: "dima",
            firstName: "דימה",
            lastName: "טרוסמן",
            role: "user",
            familyRole: "parent",
          }}
          onEdit={() => {}}
          onResetPassword={() => {}}
          onDelete={() => {}}
        />
      </SectionCard>
    </div>
  ),
}

export const CompoundComponents: Story = {
  render: () => (
    <div className="max-w-xl space-y-4">
      <SectionCard>
        <SectionCardHeader>
          <div className="space-y-1">
            <SectionCardTitle>
              <Palette className="w-5 h-5 text-primary" />
              כותרת מותאמת אישית
            </SectionCardTitle>
            <SectionCardDescription>
              תיאור מפורט באמצעות תתי-קומפוננטים
            </SectionCardDescription>
          </div>
        </SectionCardHeader>
        <SectionCardContent>
          <div className="text-sm text-foreground">
            תוכן פנימי חופשי עם שימוש ב-SectionCardContent.
          </div>
        </SectionCardContent>
      </SectionCard>
    </div>
  ),
}
