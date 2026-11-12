import * as React from "react"
import { useTranslation } from "react-i18next"
import { Shield, Users, Baby, Key } from "lucide-react"
import { UserAvatar } from "@/components/ui/user-avatar"
import { ChildBadge } from "@/components/ui/child-badge"
import { ActionButton, EditButton, DestructiveButton } from "@/components/ui/action-button"
import { getChildColor } from "@/lib/child-colors"
import { cn } from "@/lib/utils"
import type { UserRole, FamilyRole } from "@/types"

export interface AdminUserRowUser {
  id: string
  username: string
  firstName?: string | null
  lastName?: string | null
  avatar?: string | null
  role: UserRole
  familyRole?: FamilyRole
  linkedChildId?: string | null
}

export interface AdminUserRowLinkedChild {
  id: string
  name: string
  color?: string | null
}

export interface AdminUserRowProps extends React.HTMLAttributes<HTMLDivElement> {
  user: AdminUserRowUser
  isSelf?: boolean
  linkedChild?: AdminUserRowLinkedChild | null
  onEdit?: () => void
  onResetPassword?: () => void
  onDelete?: () => void
}

export function AdminUserRow({
  user,
  isSelf = false,
  linkedChild,
  onEdit,
  onResetPassword,
  onDelete,
  className,
  ...props
}: AdminUserRowProps) {
  const { t } = useTranslation()
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ")
  const userChildColor = linkedChild ? getChildColor(linkedChild.color) : null

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between py-4 sm:py-5 gap-4 hover:bg-muted/30 transition-colors",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        <UserAvatar
          avatarUrl={user.avatar}
          name={fullName || user.username}
          size="md"
          colorClassName={userChildColor ? cn(userChildColor.bg, "text-white") : undefined}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <bdi className="font-semibold text-foreground truncate max-w-[180px] sm:max-w-xs">
              {fullName || user.username}
            </bdi>
            {fullName && (
              <bdi className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-[160px]">
                ({user.username})
              </bdi>
            )}
            {isSelf && (
              <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-medium border border-transparent shrink-0">
                {t("admin.you", "אתה")}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 font-medium",
                user.role === "admin"
                  ? "text-[#D4973B] dark:text-[#F5D59E]"
                  : "text-[#3B82C4] dark:text-[#AED4F8]"
              )}
            >
              <Shield className="w-3 h-3" />
              {user.role === "admin"
                ? t("account.role_admin", "מנהל מערכת")
                : t("account.role_user", "משתמש")}
            </span>
            <span className="text-border">•</span>
            <span
              className={cn(
                "inline-flex items-center gap-1 font-medium",
                user.familyRole === "child"
                  ? "text-[#2CA58D] dark:text-[#9EE8D8]"
                  : "text-[#8A63B8] dark:text-[#D8C2F2]"
              )}
            >
              {user.familyRole === "child" ? (
                <Baby className="w-3 h-3" />
              ) : (
                <Users className="w-3 h-3" />
              )}
              {user.familyRole === "child"
                ? t("admin.role_child", "ילד/ה")
                : t("admin.role_parent", "הורה")}
            </span>
            {user.familyRole === "child" && (
              linkedChild ? (
                <>
                  <span className="text-border">•</span>
                  <ChildBadge
                    name={linkedChild.name}
                    colorId={linkedChild.color}
                    variant="solid"
                    size="sm"
                  />
                </>
              ) : (
                <>
                  <span className="text-border">•</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-transparent">
                    {t("admin.unlinked_child_badge", "לא מקושר")}
                  </span>
                </>
              )
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 self-end sm:self-center">
        {onEdit && (
          <EditButton
            onClick={onEdit}
            title={t("admin.edit_user", "עריכת משתמש")}
            className="h-8 px-2 text-xs"
          >
            <span className="hidden md:inline">{t("common.edit", "עריכה")}</span>
          </EditButton>
        )}

        {onResetPassword && (
          <ActionButton
            variant="muted"
            icon={Key}
            onClick={onResetPassword}
            title={t("admin.reset_password", "איפוס סיסמה")}
            className="h-8 px-2 text-xs"
          >
            <span className="hidden md:inline">{t("admin.reset_password_short", "איפוס סיסמה")}</span>
          </ActionButton>
        )}

        {onDelete && !isSelf && (
          <DestructiveButton
            onClick={onDelete}
            title={t("admin.delete_user", "מחיקת משתמש")}
            className="h-8 px-2 text-xs"
          >
            <span className="hidden md:inline">{t("common.delete", "מחיקה")}</span>
          </DestructiveButton>
        )}
      </div>
    </div>
  )
}
