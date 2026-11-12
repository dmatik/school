import type { Meta, StoryObj } from "@storybook/react"
import { LoginView } from "@/components/LoginView"

const meta: Meta<typeof LoginView> = {
  title: "4. Surfaces & Modals/Login",
  component: LoginView,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Authentication login view featuring a centered card with SectionCard styling (unified border border-border/40, dark:border-border/60, rounded-2xl, and background), user icon, app title, username/password fields, primary submit button, and biometric Passkey authentication.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof LoginView>

export const Default: Story = {
  args: {
    defaultHasPasskeySupport: true,
  },
}

export const WithoutPasskey: Story = {
  args: {
    defaultHasPasskeySupport: false,
  },
}

export const Loading: Story = {
  args: {
    initialUsername: "admin",
    initialPassword: "••••••••",
    simulateLoading: true,
    defaultHasPasskeySupport: true,
  },
}

export const WithError: Story = {
  args: {
    initialUsername: "admin",
    initialPassword: "wrong-password",
    initialError: "שם משתמש או סיסמה שגויים. אנא נסה שנית.",
    defaultHasPasskeySupport: true,
  },
}

export const PasskeyLoading: Story = {
  args: {
    simulatePasskeyLoading: true,
    defaultHasPasskeySupport: true,
  },
}
