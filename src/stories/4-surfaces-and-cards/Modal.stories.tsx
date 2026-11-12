import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { Modal, ConfirmModal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import {
  FilledInput,
  FilledTextarea,
  CounterField,
  TimePresetInput
} from "@/components/ui/form-field"
import { Label } from "@/components/ui/label"
import {
  AlertTriangle,
  Plus,
  Trash2,
  Clock,
  GraduationCap,
  KeyRound
} from "lucide-react"

const meta: Meta<typeof Modal> = {
  title: "4. Surfaces & Modals/Modal",
  component: Modal,
  parameters: {
    docs: {
      description: {
        component:
          "Standard unified application modal system built with `Modal` and `ConfirmModal`. Responsive: full-screen on mobile devices, centered card on desktop screens.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Modal>

export const StandardForm: Story = {
  render: function Render() {
    const [open, setOpen] = React.useState(true)
    const [examName, setExamName] = React.useState("מבחן בהיסטוריה")
    const [description, setDescription] = React.useState("פרקים 1-4: תקופת בית שני")

    return (
      <div className="p-4 flex flex-col items-start gap-4">
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 me-2" />
          פתח מודאל טופס (Modal)
        </Button>

        <Modal
          open={open}
          onOpenChange={setOpen}
          icon={GraduationCap}
          title="הוספת מבחן חדש"
          description="הזן את פרטי המבחן, התאריך והחומר הנדרש."
          onSubmit={(e) => {
            e.preventDefault()
            setOpen(false)
          }}
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                ביטול
              </Button>
              <Button type="submit">
                שמור מבחן
              </Button>
            </>
          }
        >
          <div className="space-y-2">
            <Label htmlFor="storybook-exam-name">שם המבחן / מקצוע</Label>
            <FilledInput
              id="storybook-exam-name"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="למשל: היסטוריה"
              required
            />
          </div>

          <div className="space-y-2">
            <CounterField label="חומר למבחן / הערות" htmlFor="storybook-exam-desc" currentLength={description.length} maxLength={200}>
              <FilledTextarea
                id="storybook-exam-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="פירוט החומר, עמודים בספר וכו'"
                rows={3}
                maxLength={200}
                className="resize-none"
              />
            </CounterField>
          </div>
        </Modal>
      </div>
    )
  },
}

export const DestructiveConfirm: Story = {
  render: function Render() {
    const [open, setOpen] = React.useState(true)

    return (
      <div className="p-4 flex flex-col items-start gap-4">
        <Button variant="destructive" onClick={() => setOpen(true)}>
          <Trash2 className="w-4 h-4 me-2" />
          מחק פריט (ConfirmModal)
        </Button>

        <ConfirmModal
          open={open}
          onOpenChange={setOpen}
          icon={AlertTriangle}
          title="מחיקת משתמש"
          description="האם אתה בטוח שברצונך למחוק את המשתמש? פעולה זו היא בלתי הפיכה ותמחק את כל ההגדרות המשויכות אליו."
          confirmText="כן, מחק משתמש"
          cancelText="ביטול"
          onConfirm={() => setOpen(false)}
        />
      </div>
    )
  },
}

export const TimePreset: Story = {
  render: function Render() {
    const [open, setOpen] = React.useState(true)
    const [finishTime, setFinishTime] = React.useState("13:30")
    const presets = ["11:45", "12:45", "13:30", "14:15", "15:00", "16:00"]

    return (
      <div className="p-4 flex flex-col items-start gap-4">
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Clock className="w-4 h-4 me-2" />
          שעת סיום לימודים (Modal maxWidth="sm")
        </Button>

        <Modal
          open={open}
          onOpenChange={setOpen}
          maxWidth="sm"
          title="שעת סיום לימודים"
          description="הגדר את שעת סיום הלימודים ליום נבחר."
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                ביטול
              </Button>
              <Button type="button" onClick={() => setOpen(false)}>
                שמור
              </Button>
            </div>
          }
        >
          <TimePresetInput
            id="finish-time-input-sb"
            value={finishTime}
            onChange={setFinishTime}
            label="שעת סיום"
            presetsLabel="שעות נפוצות"
            presets={presets}
          />
        </Modal>
      </div>
    )
  },
}

export const Passkey: Story = {
  render: function Render() {
    const [open, setOpen] = React.useState(true)
    const [passkeyName, setPasskeyName] = React.useState("טלפון אישי (Pixel)")

    return (
      <div className="p-4 flex flex-col items-start gap-4">
        <Button variant="outline" onClick={() => setOpen(true)}>
          <KeyRound className="w-4 h-4 me-2" />
          הוסף מפתח גישה (Passkey Modal)
        </Button>

        <Modal
          open={open}
          onOpenChange={setOpen}
          icon={KeyRound}
          title="הוספת מפתח גישה חדש"
          description="בחר שם תיאורי למפתח גישה זה, למשל 'טלפון אישי' או 'מחשב נייד'."
          onSubmit={(e) => {
            e.preventDefault()
            setOpen(false)
          }}
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                ביטול
              </Button>
              <Button type="submit" disabled={!passkeyName.trim()}>
                המשך
              </Button>
            </>
          }
        >
          <div className="space-y-2">
            <Label htmlFor="sb-passkey-name">שם מפתח הגישה</Label>
            <FilledInput
              id="sb-passkey-name"
              value={passkeyName}
              onChange={(e) => setPasskeyName(e.target.value)}
              placeholder="שם המכשיר..."
              required
            />
          </div>
        </Modal>
      </div>
    )
  },
}
