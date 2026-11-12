import type { Meta, StoryObj } from "@storybook/react"
import { AlertTriangle, Info, XCircle } from "lucide-react"
import { NoticeBanner } from "@/components/ui/notice-banner"

const meta: Meta<typeof NoticeBanner> = {
  title: "4. Surfaces & Modals/NoticeBanner",
  component: NoticeBanner,
  parameters: {
    docs: {
      description: {
        component:
          "Reusable message callout and status banner. Supports `info`, `warning`, and `destructive` variants with optional title, badge, icon, and embedded action children.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof NoticeBanner>

export const InfoVariant: Story = {
  render: () => (
    <div className="max-w-md p-4">
      <NoticeBanner
        variant="info"
        icon={Info}
        title="מידע על סנכרון"
        description="הסנכרון הבא מתוזמן לשעה 20:00 הערב."
      />
    </div>
  ),
}

export const WarningWithBadge: Story = {
  render: () => (
    <div className="max-w-md p-4">
      <NoticeBanner
        variant="warning"
        icon={AlertTriangle}
        title="שים לב"
        badge="סנכרון ידני"
        description="ביצוע סנכרון ידני עשוי לקחת עד 30 שניות."
      />
    </div>
  ),
}

export const DestructiveVariant: Story = {
  render: () => (
    <div className="max-w-md p-4">
      <NoticeBanner
        variant="destructive"
        icon={XCircle}
        title="שגיאת סנכרון"
        description="לא ניתן להתחבר לשרת Webtop. אנא בדוק את פרטי ההתחברות."
      />
    </div>
  ),
}

export const OnboardingGuideBanner: Story = {
  render: () => (
    <div className="max-w-md p-4">
      <NoticeBanner
        variant="info"
        badge="סנכרון ראשוני"
        description="כדי לייבא אירועי משמעת ושיעורים יש ללחוץ על סנכרן בהגדרות המערכת."
      />
    </div>
  ),
}
