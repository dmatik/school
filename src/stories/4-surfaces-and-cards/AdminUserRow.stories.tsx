import type { Meta, StoryObj } from "@storybook/react"
import { AdminUserRow } from "@/components/ui/admin-user-row"
import { SectionCard } from "@/components/ui/section-card"
import { Separator } from "@/components/ui/separator"
import { Users } from "lucide-react"

const meta: Meta<typeof AdminUserRow> = {
  title: "4. Surfaces & Modals/AdminUserRow",
  component: AdminUserRow,
  parameters: {
    docs: {
      description: {
        component:
          "Admin user row component used in the system administration user management list. Integrates shared `UserAvatar`, `ChildBadge`, and action buttons (`EditButton`, `ActionButton` with `Key`, `DestructiveButton`).",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof AdminUserRow>

export const AdminSelf: Story = {
  render: () => (
    <div className="max-w-xl p-4 rounded-2xl bg-card border border-border/40">
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
    </div>
  ),
}

export const ChildWithBadge: Story = {
  render: () => (
    <div className="max-w-xl p-4 rounded-2xl bg-card border border-border/40">
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
    </div>
  ),
}

export const ChildUnlinked: Story = {
  render: () => (
    <div className="max-w-xl p-4 rounded-2xl bg-card border border-border/40">
      <AdminUserRow
        user={{
          id: "user-unlinked",
          username: "child_demo",
          firstName: "ילד",
          lastName: "ללא קישור",
          role: "user",
          familyRole: "child",
          linkedChildId: null,
        }}
        onEdit={() => {}}
        onResetPassword={() => {}}
        onDelete={() => {}}
      />
    </div>
  ),
}

export const ParentUser: Story = {
  render: () => (
    <div className="max-w-xl p-4 rounded-2xl bg-card border border-border/40">
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
    </div>
  ),
}

export const WithCustomAvatar: Story = {
  render: () => (
    <div className="max-w-xl p-4 rounded-2xl bg-card border border-border/40">
      <AdminUserRow
        user={{
          id: "user-avatar-demo",
          username: "dmitry",
          firstName: "דמיטרי",
          lastName: "טרוסמן",
          role: "admin",
          familyRole: "parent",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
        }}
        onEdit={() => {}}
        onResetPassword={() => {}}
        onDelete={() => {}}
      />
    </div>
  ),
}

export const InsideSectionCardList: Story = {
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
