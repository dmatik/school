import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { FilledInput } from "@/components/ui/form-field"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Plus, Trash2 } from "lucide-react"

const meta: Meta = {
  title: "4. Surfaces & Modals/Dialogs",
  parameters: {
    docs: {
      description: {
        component: "Full-screen mobile modal vs. centered desktop card modals (Dialog and AlertDialog).",
      },
    },
  },
}

export default meta
type Story = StoryObj

export const FormDialog: Story = {
  render: function Render() {
    const [open, setOpen] = React.useState(false)

    return (
      <div className="space-y-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 me-2" />
              פתח מודאל טופס (Dialog)
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>הוספת מבחן חדש</DialogTitle>
              <DialogDescription>
                הזן את פרטי המבחן, התאריך והחומר הנדרש.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="exam-name">שם המבחן / מקצוע</Label>
                <FilledInput id="exam-name" placeholder="למשל: היסטוריה" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exam-notes">הערות נוספות</Label>
                <FilledInput id="exam-notes" placeholder="פרקים 1-3" />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                ביטול
              </Button>
              <Button onClick={() => setOpen(false)}>
                שמור מבחן
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  },
}

export const DestructiveAlertDialog: Story = {
  render: function Render() {
    const [open, setOpen] = React.useState(false)

    return (
      <div className="space-y-4">
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="w-4 h-4 me-2" />
              מחק פריט (Alert Dialog)
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                מחיקת משתמש
              </AlertDialogTitle>
              <AlertDialogDescription>
                האם אתה בטוח שברצונך למחוק את המשתמש? פעולה זו היא בלתי הפיכה ותמחק את כל ההגדרות המשויכות אליו.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setOpen(false)}>
                ביטול
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => setOpen(false)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                כן, מחק משתמש
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  },
}
