import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CounterField } from "@/components/ui/form-field"

const meta: Meta<typeof Textarea> = {
  title: "1. Fields & Inputs/Textarea",
  component: Textarea,
  parameters: {
    docs: {
      description: {
        component: "Multi-line text area supporting default card styles, filled modal styling, and live character counting.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Textarea>

export const DefaultCardTextarea: Story = {
  render: () => (
    <div className="max-w-md space-y-2">
      <Label htmlFor="default-textarea">תיבת טקסט רגילה (Card)</Label>
      <Textarea id="default-textarea" placeholder="כתוב הערות או תיאור..." rows={3} />
    </div>
  ),
}

export const FilledModalTextarea: Story = {
  render: () => (
    <div className="max-w-md space-y-2">
      <Label htmlFor="filled-textarea">תיבת טקסט מודאל (Modal / Filled)</Label>
      <Textarea
        id="filled-textarea"
        placeholder="הזן חומר למבחן..."
        rows={3}
        className="bg-muted dark:bg-secondary border-transparent"
      />
    </div>
  ),
}

export const WithCharacterCounter: Story = {
  render: function Render() {
    const [desc, setDesc] = React.useState("פרקים א'-ד' בספר שמות, כולל שאלות חזרה בעמוד 45.")
    const maxLength = 200

    return (
      <div className="max-w-md">
        <CounterField
          label="חומר למבחן / תיאור"
          htmlFor="counter-textarea"
          currentLength={desc.length}
          maxLength={maxLength}
        >
          <Textarea
            id="counter-textarea"
            value={desc}
            rows={3}
            maxLength={maxLength}
            onChange={(e) => setDesc(e.target.value)}
            className="resize-none bg-muted dark:bg-secondary border-transparent"
          />
        </CounterField>
      </div>
    )
  },
}

export const Disabled: Story = {
  render: () => (
    <div className="max-w-md space-y-2">
      <Label>מושבת</Label>
      <Textarea disabled value="תיאור לקריאה בלבד" rows={3} />
    </div>
  ),
}
