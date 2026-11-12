import type { Meta, StoryObj } from "@storybook/react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { ModeToggle } from "@/components/mode-toggle"
import { toast } from "@/hooks/use-toast"
import { MoreHorizontal, User, Settings, LogOut, Info } from "lucide-react"

const meta: Meta = {
  title: "4. Surfaces & Modals/Overlays & Controls",
  parameters: {
    docs: {
      description: {
        component: "Overlay elements including DropdownMenu, Popover, LanguageSwitcher, ModeToggle, and Toast notifications.",
      },
    },
  },
}

export default meta
type Story = StoryObj

export const DropdownMenus: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            תפריט פעולות
            <MoreHorizontal className="ms-2 w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>החשבון שלי</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <User className="me-2 w-4 h-4" />
            פרופיל אישי
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="me-2 w-4 h-4" />
            הגדרות מערכת
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive">
            <LogOut className="me-2 w-4 h-4" />
            התנתק
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ),
}

export const Popovers: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Info className="me-2 w-4 h-4" />
            מידע נוסף (Popover)
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 space-y-2">
          <h4 className="font-semibold text-sm">הסבר על סנכרון</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            המערכת מושכת נתונים אוטומטית משרתי Webtop. ניתן לבצע סנכרון ידני בלחיצה על כפתור הרענון בסרגל העליון.
          </p>
        </PopoverContent>
      </Popover>
    </div>
  ),
}

export const HeaderControls: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="text-sm font-medium text-muted-foreground">
        בוררי שפה ומצב תצוגה מהסרגל הראשי / מסך התחברות:
      </div>
      <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card w-fit">
        <LanguageSwitcher />
        <ModeToggle />
      </div>
    </div>
  ),
}

export const ToastNotifications: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="text-sm font-medium text-muted-foreground">
        שליחת הודעות קופצות (Toasts):
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={() =>
            toast({
              title: "פעולה הושלמה",
              description: "השינויים נשמרו בהצלחה במערכת.",
            })
          }
        >
          Toast רגיל (Default)
        </Button>

        <Button
          variant="outline"
          className="border-emerald-500/50 text-emerald-700 dark:text-emerald-400"
          onClick={() =>
            toast({
              variant: "success",
              title: "סנכרון Webtop הצליח",
              description: "עודכנו 3 אירועי משמעת ו-5 שיעורי בית חדשים.",
            })
          }
        >
          Toast הצלחה (Success)
        </Button>

        <Button
          variant="outline"
          className="border-destructive/50 text-destructive"
          onClick={() =>
            toast({
              variant: "destructive",
              title: "שגיאת התחברות",
              description: "שם משתמש או סיסמה שגויים. נסה שוב.",
            })
          }
        >
          Toast שגיאה (Destructive)
        </Button>
      </div>
    </div>
  ),
}
