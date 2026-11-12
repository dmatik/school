import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FilledInput, IconInput, CounterField, ReadOnlyPillField, TimePresetInput } from "@/components/ui/form-field"
import { User, Lock, Clock, Shield } from "lucide-react"

const meta: Meta<typeof Input> = {
  title: "1. Fields & Inputs/Input",
  component: Input,
  parameters: {
    docs: {
      description: {
        component: "Collection of input field variants used across the application: default card input, filled modal input, leading-icon input, counter field, read-only display pill, and time presets.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Input>

export const DefaultCardInput: Story = {
  render: () => (
    <div className="max-w-sm space-y-2">
      <Label htmlFor="default-input">שדה קלט רגיל (כרטיס / Card)</Label>
      <Input id="default-input" placeholder="הקלד כאן..." defaultValue="" />
    </div>
  ),
}

export const FilledModalInput: Story = {
  render: () => (
    <div className="max-w-sm space-y-2">
      <Label htmlFor="filled-input">שדה מודאל / טופס (Filled / Modal)</Label>
      <FilledInput id="filled-input" placeholder="הכנס שם מלא..." defaultValue="" />
    </div>
  ),
}

export const IconInputs: Story = {
  render: () => (
    <div className="max-w-sm space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="user-icon-input">שם משתמש (Login)</Label>
        <IconInput id="user-icon-input" icon={User} placeholder="הכנס שם משתמש..." />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pass-icon-input">סיסמה (Login)</Label>
        <IconInput id="pass-icon-input" type="password" icon={Lock} placeholder="••••••••" />
      </div>
    </div>
  ),
}

export const WithCharacterCounter: Story = {
  render: function Render() {
    const [val, setVal] = React.useState("מבחן אמצע במתמטיקה")
    const maxLength = 50
    return (
      <div className="max-w-sm">
        <CounterField
          label="שם המבחן"
          htmlFor="counter-input"
          currentLength={val.length}
          maxLength={maxLength}
        >
          <FilledInput
            id="counter-input"
            value={val}
            maxLength={maxLength}
            onChange={(e) => setVal(e.target.value)}
          />
        </CounterField>
      </div>
    )
  },
}

export const ReadOnlyPillDisplay: Story = {
  render: () => (
    <div className="max-w-sm space-y-3">
      <ReadOnlyPillField label="שם משתמש במערכת" value="admin" />
      <ReadOnlyPillField label="תפקיד" value="מנהל מערכת" icon={Shield} />
      <ReadOnlyPillField label="שעת סיום משוערת" value="13:30" icon={Clock} />
    </div>
  ),
}

export const TimeInputWithPresets: Story = {
  render: function Render() {
    const [time, setTime] = React.useState("13:30")
    return (
      <div className="max-w-sm">
        <TimePresetInput
          value={time}
          onChange={setTime}
          presetsLabel="שעות פיזור נפוצות"
        />
      </div>
    )
  },
}

export const DisabledAndInvalidStates: Story = {
  render: () => (
    <div className="max-w-sm space-y-4">
      <div className="space-y-1.5">
        <Label>שדה מושבת (Disabled)</Label>
        <Input disabled value="ערך נעול שלא ניתן לעריכה" />
      </div>
      <div className="space-y-1.5">
        <Label>שדה מושבת במודאל</Label>
        <FilledInput disabled value="מנהל קבוע (ברירת מחדל)" />
      </div>
    </div>
  ),
}
