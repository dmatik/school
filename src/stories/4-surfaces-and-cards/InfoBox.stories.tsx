import type { Meta, StoryObj } from "@storybook/react"
import { Shield, Users, Calendar, Key } from "lucide-react"
import { InfoBox, InfoItem } from "@/components/ui/info-box"

const meta: Meta<typeof InfoBox> = {
  title: "4. Surfaces & Modals/InfoBox",
  component: InfoBox,
  parameters: {
    docs: {
      description: {
        component:
          "Reusable informational key-value display container. Features elevated secondary background in dark theme (`bg-muted/40 dark:bg-secondary/80`), rounded-xl corners, responsive grid columns, and LTR bdi isolation for timestamps and usernames.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof InfoBox>

export const WebtopConnectedInfo: Story = {
  render: () => (
    <div className="max-w-md p-4 rounded-2xl bg-card border border-border/40 shadow-xs">
      <InfoBox columns={2}>
        <InfoItem label="שם משתמש Webtop" value="KQT460" />
        <InfoItem
          label="סנכרון אחרון"
          value="11/11/2026, 18:56:07"
          isLtr
          valueClassName="text-xs font-medium"
        />
      </InfoBox>
    </div>
  ),
}

export const ThreeColumnsProfileSummary: Story = {
  render: () => (
    <div className="max-w-lg p-4 rounded-2xl bg-card border border-border/40 shadow-xs">
      <InfoBox columns={3}>
        <InfoItem label="שם משתמש" value="admin" />
        <InfoItem
          label="תפקיד במערכת"
          value="מנהל מערכת"
          icon={<Shield className="w-4 h-4 text-[#D4973B]" />}
        />
        <InfoItem
          label="תפקיד משפחתי"
          value="הורה"
          icon={<Users className="w-4 h-4 text-[#8A63B8]" />}
        />
      </InfoBox>
    </div>
  ),
}

export const ArrayItemsProp: Story = {
  render: () => (
    <div className="max-w-md p-4 rounded-2xl bg-card border border-border/40 shadow-xs">
      <InfoBox
        columns={2}
        items={[
          { label: "מזהה משתמש", value: "usr_99182a", isLtr: true },
          { label: "תאריך הצטרפות", value: "01/09/2026", isLtr: true, icon: <Calendar className="w-3.5 h-3.5 text-primary" /> },
          { label: "אימות דו-שלבי", value: "פעיל (WebAuthn)", icon: <Key className="w-3.5 h-3.5 text-emerald-500" /> },
          { label: "סטטוס חשבון", value: "מאומת ומחובר" },
        ]}
      />
    </div>
  ),
}

export const SingleColumn: Story = {
  render: () => (
    <div className="max-w-sm p-4 rounded-2xl bg-card border border-border/40 shadow-xs">
      <InfoBox columns={1}>
        <InfoItem label="סטטוס חיבור" value="מחובר לשרת Webtop הראשי" />
      </InfoBox>
    </div>
  ),
}
