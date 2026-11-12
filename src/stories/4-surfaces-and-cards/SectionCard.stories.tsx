import type { Meta, StoryObj } from "@storybook/react"
import { Palette, GraduationCap, CheckCircle2, Globe, Plus, Users, User, Shield, Check, Lock, Fingerprint, Smartphone, Laptop, Layers } from "lucide-react"
import {
  SectionCard,
  SectionCardHeader,
  SectionCardTitle,
  SectionCardDescription,
  SectionCardContent,
} from "@/components/ui/section-card"
import { Button } from "@/components/ui/button"
import { DestructiveButton } from "@/components/ui/action-button"
import { EmptyStateCard } from "@/components/ui/empty-state-card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { AdminUserRow } from "@/components/ui/admin-user-row"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Label } from "@/components/ui/label"
import { FilledInput, ReadOnlyPillField } from "@/components/ui/form-field"

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
        icon={Layers}
        title="כרטיס עם פעולה בכותרת"
        description="דוגמה לשימוש ב-prop של פעולה (action) לצד כותרת הכרטיס"
        action={
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 shrink-0 h-9"
          >
            <Plus className="w-4 h-4" />
            <span>פעולה חדשה</span>
          </Button>
        }
      >
        <div className="text-sm text-muted-foreground">
          תוכן הכרטיס. כפתור הפעולה מוצג בצד הכותרת בדסקטופ, ומתחתיה במובייל לפי ה-Layout הרספונסיבי.
        </div>
      </SectionCard>
    </div>
  ),
}

export const AccountProfileSection: Story = {
  render: function Render() {
    return (
      <div className="max-w-xl space-y-4">
        <SectionCard
          icon={User}
          title="פרטים אישיים"
          description="עדכון שם מלא ותמונת פרופיל"
        >
          <div className="space-y-4">
            <div className="pb-4 border-b border-border/40 dark:border-border/60 flex justify-center">
              <UserAvatar
                size="xl"
                editable
                avatarUrl="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces"
                name="מנהל מערכת"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ReadOnlyPillField
                label="שם משתמש"
                value="admin"
              />
              <ReadOnlyPillField
                label="תפקיד"
                value="מנהל מערכת"
                icon={Shield}
                iconClassName="text-[#D4973B]"
              />
              <ReadOnlyPillField
                label="תפקיד במשפחה"
                value="הורה"
                icon={Users}
                iconClassName="text-[#8A63B8]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="demo-firstName">שם פרטי</Label>
              <FilledInput
                id="demo-firstName"
                defaultValue="מנהל"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="demo-lastName">שם משפחה</Label>
              <FilledInput
                id="demo-lastName"
                defaultValue="מערכת"
              />
            </div>

            <Button type="button" className="w-full">
              <Check className="w-4 h-4 me-2" />
              שמירה
            </Button>
          </div>
        </SectionCard>
      </div>
    )
  },
}

export const ChangePasswordSection: Story = {
  render: function Render() {
    return (
      <div className="max-w-xl space-y-4">
        <SectionCard
          icon={Lock}
          title="שינוי סיסמה"
          description="עדכון סיסמת החשבון"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="demo-currentPassword">סיסמה נוכחית</Label>
              <FilledInput
                id="demo-currentPassword"
                type="password"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="demo-newPassword">סיסמה חדשה</Label>
              <FilledInput
                id="demo-newPassword"
                type="password"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="demo-confirmPassword">אימות סיסמה חדשה</Label>
              <FilledInput
                id="demo-confirmPassword"
                type="password"
                placeholder="••••••••"
              />
            </div>

            <Button type="button" variant="secondary" className="w-full">
              עדכן סיסמה
            </Button>
          </div>
        </SectionCard>
      </div>
    )
  },
}

export const AccountPasskeysSection: Story = {
  render: function Render() {
    return (
      <div className="max-w-xl space-y-4">
        <SectionCard
          icon={Fingerprint}
          title="מפתחות גישה ביומטריים (Passkeys)"
          description="מפתחות גישה מאפשרים התחברות מאובטחת ומהירה באמצעות זיהוי פנים, טביעת אצבע או נעילת המכשיר ללא צורך בהקלדת סיסמה."
          action={
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 shrink-0 h-9"
            >
              <Plus className="w-4 h-4" />
              <span>הוסף מפתח גישה</span>
            </Button>
          }
        >
          <div className="divide-y divide-border/40">
            <div className="p-3 sm:p-3.5 flex items-center justify-between gap-2.5 sm:gap-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 min-w-0">
                    <span className="text-sm font-semibold truncate">מפתח גישה ל-Android</span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0 self-start sm:self-auto">
                      מסונכרן
                    </span>
                  </div>
                  <div className="text-[11px] sm:text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                    <span>
                      נוצר ב- <bdi dir="ltr">29/10/2026</bdi>
                    </span>
                    <span className="opacity-40">•</span>
                    <span>
                      שימוש אחרון: <bdi dir="ltr">11/11/2026</bdi>
                    </span>
                  </div>
                </div>
              </div>

              <DestructiveButton
                size="icon"
                title="מחק"
                className="shrink-0 h-8 w-8 p-0"
              />
            </div>

            <div className="p-3 sm:p-3.5 flex items-center justify-between gap-2.5 sm:gap-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Laptop className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 min-w-0">
                    <span className="text-sm font-semibold truncate">MacBook Pro Touch ID</span>
                  </div>
                  <div className="text-[11px] sm:text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                    <span>
                      נוצר ב- <bdi dir="ltr">01/11/2026</bdi>
                    </span>
                  </div>
                </div>
              </div>

              <DestructiveButton
                size="icon"
                title="מחק"
                className="shrink-0 h-8 w-8 p-0"
              />
            </div>
          </div>
        </SectionCard>
      </div>
    )
  },
}

export const AccountPasskeysEmptySection: Story = {
  render: function Render() {
    return (
      <div className="max-w-xl space-y-4">
        <SectionCard
          icon={Fingerprint}
          title="מפתחות גישה ביומטריים (Passkeys)"
          description="מפתחות גישה מאפשרים התחברות מאובטחת ומהירה באמצעות זיהוי פנים, טביעת אצבע או נעילת המכשיר ללא צורך בהקלדת סיסמה."
          action={
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 shrink-0 h-9"
            >
              <Plus className="w-4 h-4" />
              <span>הוסף מפתח גישה</span>
            </Button>
          }
        >
          <EmptyStateCard
            icon={Fingerprint}
            title="אין מפתחות גישה רשומים"
            description="הוסף מפתח גישה כדי להתחבר במהירות ובבטחה באמצעות טביעת אצבע או זיהוי פנים."
            iconClassName="bg-primary/10 text-primary"
            actions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 text-xs"
              >
                <Plus className="w-3.5 h-3.5 me-1.5" />
                הוסף מפתח גישה
              </Button>
            }
          />
        </SectionCard>
      </div>
    )
  },
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
