import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { LogoutButton } from "@/components/ui/logout-button"

const meta: Meta<typeof LogoutButton> = {
  title: "2. Buttons & Navigation/LogoutButton",
  component: LogoutButton,
  parameters: {
    docs: {
      description: {
        component:
          "Pill-shaped outline logout button with destructive red hover states, dedicated LogOut icon, and smooth RTL/LTR layout. Placed at the bottom of the Account settings surface.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof LogoutButton>

export const Default: Story = {
  render: function Render() {
    const [loggedOut, setLoggedOut] = React.useState(false)

    return (
      <div className="space-y-4 max-w-sm">
        <div className="text-sm font-semibold text-muted-foreground">
          כפתור התנתקות ברירת מחדל:
        </div>
        <LogoutButton
          onLogout={() => {
            setLoggedOut(true)
            setTimeout(() => setLoggedOut(false), 2000)
          }}
        />
        {loggedOut && (
          <div className="text-xs text-destructive font-medium animate-in fade-in">
            התבצעה התנתקות בהצלחה!
          </div>
        )}
      </div>
    )
  },
}

export const English: Story = {
  render: () => (
    <div className="space-y-4 max-w-sm" dir="ltr">
      <div className="text-sm font-semibold text-muted-foreground">
        English layout with custom label:
      </div>
      <LogoutButton>Sign Out</LogoutButton>
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div className="space-y-4 max-w-sm">
      <div className="text-sm font-semibold text-muted-foreground">
        מצב מושבת:
      </div>
      <LogoutButton disabled />
    </div>
  ),
}

export const InAccountPageContext: Story = {
  render: () => (
    <div className="p-6 rounded-2xl border border-border/40 bg-card max-w-lg space-y-4">
      <div className="text-xs text-muted-foreground text-center">
        תחתית עמוד חשבון והגדרות (Account Page Bottom Footer):
      </div>
      <div className="pt-2 flex justify-center">
        <LogoutButton onClick={() => alert("Logout clicked")} />
      </div>
    </div>
  ),
}
