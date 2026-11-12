import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { ColorSwatchPicker } from "@/components/ui/color-swatch-picker"
import { ChildBadge } from "@/components/ui/child-badge"
import { InfoBox } from "@/components/ui/info-box"
import { FieldLabel } from "@/components/ui/form-field"

const meta: Meta<typeof ColorSwatchPicker> = {
  title: "3. Badges, Avatars & Pickers/ColorSwatchPicker",
  component: ColorSwatchPicker,
  parameters: {
    docs: {
      description: {
        component: "Child color swatch palette selector from SettingsPage, allowing parents to assign or clear custom child colors.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof ColorSwatchPicker>

export const InteractiveColorPicker: Story = {
  render: function Render() {
    const [selectedColor, setSelectedColor] = React.useState<string | null>("blue")

    return (
      <div className="space-y-4 max-w-md p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">איתי כהן (כיתה ד'2)</span>
          <ChildBadge name="תצוגה מקדימה" colorId={selectedColor} />
        </div>

        <ColorSwatchPicker
          selectedColorId={selectedColor}
          onSelectColor={setSelectedColor}
        />

        <div className="text-xs text-muted-foreground pt-1">
          צבע נבחר כעת: <span className="font-bold">{selectedColor || "ברירת מחדל (ללא צבע)"}</span>
        </div>
      </div>
    )
  },
}

export const SwatchSizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">קטן (sm):</span>
        <ColorSwatchPicker selectedColorId="emerald" onSelectColor={() => {}} swatchSize="sm" />
      </div>
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">רגיל (default):</span>
        <ColorSwatchPicker selectedColorId="purple" onSelectColor={() => {}} swatchSize="default" />
      </div>
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">גדול (lg):</span>
        <ColorSwatchPicker selectedColorId="rose" onSelectColor={() => {}} swatchSize="lg" />
      </div>
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">בורר צבעים מושבת:</div>
      <ColorSwatchPicker disabled selectedColorId="cyan" onSelectColor={() => {}} />
    </div>
  ),
}

export const InsideInfoBox: Story = {
  render: function Render() {
    const [color, setColor] = React.useState<string | null>("emerald")

    return (
      <div className="max-w-xl p-4 rounded-2xl bg-card border border-border/40 shadow-xs">
        <InfoBox columns={1} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <ChildBadge name="כפיר טרוסמן" colorId={color} variant="solid" size="sm" />
            <span className="text-xs text-muted-foreground">(כיתה ד-2)</span>
          </div>
          <ColorSwatchPicker
            selectedColorId={color}
            onSelectColor={setColor}
            clearPosition="end"
          />
        </InfoBox>
      </div>
    )
  },
}

export const LinkedKidsColorSection: Story = {
  render: function Render() {
    const [color1, setColor1] = React.useState<string | null>("emerald")
    const [color2, setColor2] = React.useState<string | null>("blue")

    return (
      <div className="max-w-xl p-4 rounded-2xl bg-card border border-border/40 shadow-xs space-y-3">
        <FieldLabel
          label="ילדים מקושרים וצבעי תגיות"
          description="בחירת צבע תגית אישי עבור כל ילד"
        />

        <div className="space-y-2.5">
          <InfoBox columns={1} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <ChildBadge name="כפיר טרוסמן" colorId={color1} variant="solid" size="sm" />
              <span className="text-xs text-muted-foreground">(כיתה ד-2)</span>
            </div>
            <ColorSwatchPicker
              selectedColorId={color1}
              onSelectColor={setColor1}
              clearPosition="end"
            />
          </InfoBox>

          <InfoBox columns={1} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <ChildBadge name="רונן טרוסמן" colorId={color2} variant="solid" size="sm" />
              <span className="text-xs text-muted-foreground">(כיתה ו-2)</span>
            </div>
            <ColorSwatchPicker
              selectedColorId={color2}
              onSelectColor={setColor2}
              clearPosition="end"
            />
          </InfoBox>
        </div>
      </div>
    )
  },
}

