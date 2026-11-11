import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { UserAvatar } from "@/components/ui/user-avatar"

const meta: Meta<typeof UserAvatar> = {
  title: "3. Badges, Avatars & Pickers/UserAvatar",
  component: UserAvatar,
  parameters: {
    docs: {
      description: {
        component: "User avatar component in 4 sizes (sm, md, lg, xl), initial letter fallback, child-colored backgrounds, and profile image editing overlay.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof UserAvatar>

export const NavigationHeaderAvatar: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="text-sm font-medium text-muted-foreground">
        אוואטר תפריט עליון / ניווט ראשי (sm - 36px עם ובלי טבעת בחירה):
      </div>
      <div className="flex items-center gap-4">
        <UserAvatar size="sm" name="דוד כהן" activeRing={false} />
        <UserAvatar size="sm" name="דוד כהן" activeRing={true} />
        <UserAvatar
          size="sm"
          name="מאיה"
          avatarUrl="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&q=80"
          activeRing={true}
        />
      </div>
    </div>
  ),
}

export const UserListAvatarsWithChildColors: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="text-sm font-medium text-muted-foreground">
        אוואטר רשימת משתמשים (md - 40px) עם צבעי תלמידים:
      </div>
      <div className="flex items-center gap-3">
        <UserAvatar size="md" name="איתי" colorClassName="bg-[#3B82C4] text-white" />
        <UserAvatar size="md" name="מאיה" colorClassName="bg-[#2CA58D] text-white" />
        <UserAvatar size="md" name="נועם" colorClassName="bg-[#8A63B8] text-white" />
        <UserAvatar size="md" name="דניאל" colorClassName="bg-[#D4973B] text-white" />
        <UserAvatar size="md" name="שירה" colorClassName="bg-[#C86478] text-white" />
      </div>
    </div>
  ),
}

export const EditableProfileAvatar: Story = {
  render: function Render() {
    const [avatar, setAvatar] = React.useState<string | null>(
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&q=80"
    )

    return (
      <div className="space-y-4 max-w-sm p-4 rounded-xl border border-border bg-card">
        <div className="text-sm font-medium text-muted-foreground">
          אוואטר עריכת פרופיל (xl - 96px עם מצלמה בריחוף וכפתורי החלפה/מחיקה):
        </div>
        <UserAvatar
          size="xl"
          name="דוד כהן"
          editable={true}
          avatarUrl={avatar}
          onAvatarRemove={() => setAvatar(null)}
          onAvatarChange={() => {
            alert("File selected simulator")
          }}
        />
      </div>
    )
  },
}
