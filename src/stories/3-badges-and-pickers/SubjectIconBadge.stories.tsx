import type { Meta, StoryObj } from "@storybook/react"
import { SubjectIconBadge } from "@/components/ui/subject-icon-badge"

const meta: Meta<typeof SubjectIconBadge> = {
  title: "3. Badges, Avatars & Pickers/SubjectIconBadge",
  component: SubjectIconBadge,
  parameters: {
    docs: {
      description: {
        component: "Visual gallery of subject icons covering all 15 recognized school subjects, matching solid square and soft badge styling.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof SubjectIconBadge>

const ALL_SUBJECTS = [
  { name: "מתמטיקה", desc: "1. Math / Blue" },
  { name: "אנגלית", desc: "2. English / Purple" },
  { name: "מדעים", desc: "3. Science / Emerald" },
  { name: "תנך", desc: "4. Bible & Heritage / Amber" },
  { name: "אומנות", desc: "5. Art / Rose" },
  { name: "חינוך גופני", desc: "6. Sports / Orange" },
  { name: "היסטוריה", desc: "7. History & Civics / Cyan" },
  { name: "גאוגרפיה", desc: "8. Geography / Teal" },
  { name: "מוזיקה", desc: "9. Music / Fuchsia" },
  { name: "מחשבים", desc: "10. Coding / Sky" },
  { name: "דרמה", desc: "11. Drama / Violet" },
  { name: "כישורי חיים", desc: "12. Life Skills / Pink" },
  { name: "פרטני", desc: "13. Enrichment / Yellow" },
  { name: "עברית ולשון", desc: "14. Hebrew / Indigo" },
  { name: "נושא כללי", desc: "15. Default Fallback" },
]

export const AllSubjectsGallerySolid: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="text-sm font-medium text-muted-foreground">
        סגנון סולידי מלא (Solid Badge - ברירת המחדל המשמשת בכרטיסים):
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {ALL_SUBJECTS.map((sub) => (
          <div key={sub.name} className="flex items-center gap-3 p-2.5 rounded-xl border border-border/60 bg-card">
            <SubjectIconBadge subject={sub.name} variant="solid" />
            <div className="min-w-0">
              <div className="text-sm font-bold truncate">{sub.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{sub.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
}

export const AllSubjectsGallerySoft: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="text-sm font-medium text-muted-foreground">
        סגנון רקע רך (Soft Badge):
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {ALL_SUBJECTS.map((sub) => (
          <div key={sub.name} className="flex items-center gap-3 p-2.5 rounded-xl border border-border/60 bg-card">
            <SubjectIconBadge subject={sub.name} variant="soft" />
            <div className="min-w-0">
              <div className="text-sm font-bold truncate">{sub.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{sub.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
}

export const BadgeSizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <div className="text-center space-y-1">
        <SubjectIconBadge subject="מתמטיקה" size="sm" />
        <span className="text-xs text-muted-foreground">קטן (32px)</span>
      </div>
      <div className="text-center space-y-1">
        <SubjectIconBadge subject="מתמטיקה" size="default" />
        <span className="text-xs text-muted-foreground">רגיל (44px)</span>
      </div>
      <div className="text-center space-y-1">
        <SubjectIconBadge subject="מתמטיקה" size="lg" />
        <span className="text-xs text-muted-foreground">גדול (56px)</span>
      </div>
    </div>
  ),
}
