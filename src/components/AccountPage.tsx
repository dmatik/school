import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/ui/page-header"
import { User, Lock, Check, Shield, Loader2, Fingerprint, Plus, Smartphone, Laptop, Key, Users, Baby } from "lucide-react"
import { SectionCard } from "@/components/ui/section-card"
import { UserAvatar } from "@/components/ui/user-avatar"
import { FilledInput, ReadOnlyPillField } from "@/components/ui/form-field"
import { Button } from "@/components/ui/button"
import { DestructiveButton } from "@/components/ui/action-button"
import { LogoutButton } from "@/components/ui/logout-button"
import { EmptyStateCard } from "@/components/ui/empty-state-card"
import { Label } from "@/components/ui/label"
import { Modal, ConfirmModal } from "@/components/ui/modal"
import { toast } from "@/hooks/use-toast"
import { formatSystemDate } from "@/lib/utils"
import { isPasskeySupported, registerPasskey, fetchUserPasskeys, deletePasskey, type PasskeyInfo } from "@/lib/webauthn"
import { compressImage } from "@/lib/image"
import type { User as UserType } from "@/types"

interface AccountPageProps {
  user: UserType
  token: string
  onUpdateUser: (updated: UserType) => void
  onLogout: () => void
}

export function AccountPage({ user, token, onUpdateUser, onLogout }: AccountPageProps) {
  const { t } = useTranslation()

  // Profile Form State
  const [firstName, setFirstName] = useState(user.firstName || "")
  const [lastName, setLastName] = useState(user.lastName || "")
  const [avatar, setAvatar] = useState(user.avatar || "")
  const [savingProfile, setSavingProfile] = useState(false)

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

  // Passkeys State
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([])
  const [loadingPasskeys, setLoadingPasskeys] = useState(false)
  const [addingPasskey, setAddingPasskey] = useState(false)
  const [showAddPasskeyDialog, setShowAddPasskeyDialog] = useState(false)
  const [newPasskeyName, setNewPasskeyName] = useState("")
  const [passkeyToDelete, setPasskeyToDelete] = useState<PasskeyInfo | null>(null)
  const [deletingPasskey, setDeletingPasskey] = useState(false)
  const [passkeySupported, setPasskeySupported] = useState(false)

  const loadPasskeys = useCallback(async () => {
    setLoadingPasskeys(true)
    try {
      const list = await fetchUserPasskeys(token)
      setPasskeys(list)
    } catch (err) {
      console.error("Failed to load passkeys:", err)
    } finally {
      setLoadingPasskeys(false)
    }
  }, [token])

  useEffect(() => {
    setPasskeySupported(isPasskeySupported())
    loadPasskeys()
  }, [loadPasskeys])

  const handleStartAddPasskey = () => {
    if (!passkeySupported) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("account.passkey_not_supported")
      })
      return
    }

    const ua = navigator.userAgent
    let defaultName = t("account.passkey_default_name")
    if (/iPhone|iPad/i.test(ua)) defaultName = t("account.passkey_device_iphone")
    else if (/Macintosh|Mac OS/i.test(ua)) defaultName = t("account.passkey_device_mac")
    else if (/Android/i.test(ua)) defaultName = t("account.passkey_device_android")
    else if (/Windows/i.test(ua)) defaultName = t("account.passkey_device_windows")

    setNewPasskeyName(defaultName)
    setShowAddPasskeyDialog(true)
  }

  const handleConfirmAddPasskey = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddingPasskey(true)
    try {
      const created = await registerPasskey(token, newPasskeyName || "Passkey")
      setPasskeys(prev => [created, ...prev])
      setShowAddPasskeyDialog(false)
      toast({
        variant: "success",
        title: t("account.passkey_created_title"),
        description: t("account.passkey_created_desc")
      })
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      if (errorObj.name !== 'NotAllowedError') {
        toast({
          variant: "destructive",
          title: t("common.error"),
          description: errorObj.message || t("account.passkey_failed")
        })
      }
    } finally {
      setAddingPasskey(false)
    }
  }

  const handleDeletePasskey = async () => {
    if (!passkeyToDelete) return
    setDeletingPasskey(true)
    try {
      await deletePasskey(token, passkeyToDelete.id)
      setPasskeys(prev => prev.filter(p => p.id !== passkeyToDelete.id))
      setPasskeyToDelete(null)
      toast({
        variant: "success",
        title: t("account.passkey_deleted_title"),
        description: t("account.passkey_deleted_desc")
      })
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("account.passkey_failed")
      })
    } finally {
      setDeletingPasskey(false)
    }
  }

  // Handle avatar file selection with client-side compression and 5MB limit
  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limit file size to 5MB
    const MAX_FILE_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      toast({
        variant: "destructive",
        title: t("account.avatar_too_large"),
        description: t("account.avatar_size_limit_desc")
      })
      e.target.value = ""
      return
    }

    try {
      const compressed = await compressImage(file, { maxWidth: 512, maxHeight: 512, quality: 0.85 })
      setAvatar(compressed)
    } catch {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("account.avatar_invalid_format")
      })
    } finally {
      e.target.value = ""
    }
  }

  // Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName,
          lastName,
          avatar
        })
      })

      const isJson = res.headers.get("content-type")?.includes("application/json")
      const data = isJson ? await res.json().catch(() => null) : null
      if (!res.ok) {
        if (res.status === 413 || data?.error === "payload_too_large" || data?.error === "avatar_too_large") {
          toast({
            variant: "destructive",
            title: t("account.avatar_too_large"),
            description: t("account.avatar_size_limit_desc")
          })
          return
        }
        if (data?.error === "avatar_invalid_format") {
          toast({
            variant: "destructive",
            title: t("common.error"),
            description: t("account.avatar_invalid_format")
          })
          return
        }
        throw new Error(data?.message || data?.error || t("account.update_failed"))
      }

      onUpdateUser(data.user)
      toast({
        variant: "success",
        title: t("account.profile_updated_title"),
        description: t("account.profile_updated_desc")
      })
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("account.update_failed")
      })
    } finally {
      setSavingProfile(false)
    }
  }

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: t("account.password_mismatch_title"),
        description: t("account.password_mismatch_desc")
      })
      return
    }

    if (newPassword.length < 4) {
      toast({
        variant: "destructive",
        title: t("account.password_too_short_title"),
        description: t("account.password_too_short_desc")
      })
      return
    }

    setSavingPassword(true)

    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })

      const isJson = res.headers.get("content-type")?.includes("application/json")
      const data = isJson ? await res.json().catch(() => null) : null
      if (!res.ok) {
        throw new Error(data?.error || t("account.password_change_failed"))
      }

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

      toast({
        variant: "success",
        title: t("account.password_changed_title"),
        description: t("account.password_changed_desc")
      })
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("account.password_change_failed")
      })
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="h-full flex flex-col pt-[3.75rem] pb-24 px-4 md:pt-6 md:pb-6 md:px-6 overflow-y-auto overscroll-y-contain gap-4 md:gap-6 max-w-3xl mx-auto w-full">
      {/* Page Header (Desktop only) */}
      <PageHeader sticky={false} title={t("account.title")} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Profile Section */}
        <SectionCard
          icon={User}
          title={t("account.personal_info")}
          description={t("account.personal_info_desc")}
        >
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Avatar Selector reusing shared UserAvatar */}
            <div className="pb-4 border-b border-border/40 dark:border-border/60 flex justify-center">
              <UserAvatar
                size="xl"
                editable
                avatarUrl={avatar}
                name={firstName || user.username}
                onAvatarChange={handleAvatarFile}
                onAvatarRemove={() => setAvatar("")}
              />
            </div>

            {/* Username, System Role & Family Role (Read only) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ReadOnlyPillField
                label={t("auth.username")}
                value={user.username}
              />
              <ReadOnlyPillField
                label={t("account.role")}
                value={user.role === 'admin' ? t("account.role_admin") : t("account.role_user")}
                icon={Shield}
                iconClassName={user.role === 'admin' ? 'text-[#D4973B]' : 'text-[#3B82C4]'}
              />
              <ReadOnlyPillField
                label={t("account.family_role")}
                value={user.familyRole === 'child' ? t("account.role_child") : t("account.role_parent")}
                icon={user.familyRole === 'child' ? Baby : Users}
                iconClassName={user.familyRole === 'child' ? 'text-[#2CA58D]' : 'text-[#8A63B8]'}
              />
            </div>

            {/* Name & Family Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName">{t("account.first_name")}</Label>
              <FilledInput
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t("account.first_name_placeholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">{t("account.last_name")}</Label>
              <FilledInput
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t("account.last_name_placeholder")}
              />
            </div>

            <Button type="submit" disabled={savingProfile} className="w-full">
              {savingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin me-2" />
                  {t("common.saving")}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 me-2" />
                  {t("common.save")}
                </>
              )}
            </Button>
          </form>
        </SectionCard>

        {/* Change Password Section */}
        <SectionCard
          icon={Lock}
          title={t("account.change_password")}
          description={t("account.change_password_desc")}
        >
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t("account.current_password")}</Label>
              <FilledInput
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">{t("account.new_password")}</Label>
              <FilledInput
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("account.confirm_password")}</Label>
              <FilledInput
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" variant="secondary" disabled={savingPassword} className="w-full">
              {savingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin me-2" />
                  {t("common.saving")}
                </>
              ) : (
                t("account.update_password_button")
              )}
            </Button>
          </form>
        </SectionCard>

        {/* Passkeys Section */}
        <SectionCard
          icon={Fingerprint}
          title={t("account.passkeys_title")}
          description={t("account.passkeys_desc")}
          className="md:col-span-2"
          action={
            <Button
              type="button"
              size="sm"
              onClick={handleStartAddPasskey}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 shrink-0 h-9"
            >
              <Plus className="w-4 h-4" />
              <span>{t("account.add_passkey")}</span>
            </Button>
          }
        >
          {loadingPasskeys ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : passkeys.length === 0 ? (
            <EmptyStateCard
              icon={Fingerprint}
              title={t("account.no_passkeys")}
              description={t("account.no_passkeys_desc")}
              iconClassName="bg-primary/10 text-primary"
              actions={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleStartAddPasskey}
                  className="mt-2 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 me-1.5" />
                  {t("account.add_passkey")}
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-border/40">
              {passkeys.map((p) => {
                const lower = p.deviceName.toLowerCase()
                const IconComponent = (lower.includes('phone') || lower.includes('android') || lower.includes('ios'))
                  ? Smartphone
                  : (lower.includes('mac') || lower.includes('windows') || lower.includes('pc') || lower.includes('laptop'))
                    ? Laptop
                    : Fingerprint

                return (
                  <div key={p.id} className="p-3 sm:p-3.5 flex items-center justify-between gap-2.5 sm:gap-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 min-w-0">
                          <span className="text-sm font-semibold truncate">{p.deviceName}</span>
                          {p.backedUp ? (
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0 self-start sm:self-auto">
                              {t("account.synced")}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[11px] sm:text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <span>
                            {t("account.created_on", { date: "" })}
                            <bdi dir="ltr">{formatSystemDate(p.createdAt)}</bdi>
                          </span>
                          {p.lastUsedAt && (
                            <>
                              <span className="opacity-40">•</span>
                              <span>
                                {t("account.last_used", { date: "" })}
                                <bdi dir="ltr">{formatSystemDate(p.lastUsedAt)}</bdi>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <DestructiveButton
                      size="icon"
                      onClick={() => setPasskeyToDelete(p)}
                      title={t("common.delete")}
                      className="shrink-0 h-8 w-8 p-0"
                    />
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Logout Button at bottom of Account Page */}
      <div className="pt-2 flex justify-center">
        <LogoutButton onLogout={onLogout} />
      </div>

      {/* Add Passkey Modal */}
      <Modal
        open={showAddPasskeyDialog}
        onOpenChange={setShowAddPasskeyDialog}
        icon={Fingerprint}
        title={t("account.add_passkey")}
        description={t("account.passkeys_desc")}
        onSubmit={handleConfirmAddPasskey}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddPasskeyDialog(false)}
              disabled={addingPasskey}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={addingPasskey}>
              {addingPasskey ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin me-2" />
                  {t("account.adding_passkey")}
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 me-2" />
                  {t("common.confirm")}
                </>
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="passkeyName">{t("account.passkey_name_prompt")}</Label>
          <FilledInput
            id="passkeyName"
            value={newPasskeyName}
            onChange={(e) => setNewPasskeyName(e.target.value)}
            placeholder={t("account.passkey_name_placeholder")}
            required
          />
        </div>
      </Modal>

      {/* Delete Passkey Confirmation Modal */}
      <ConfirmModal
        open={!!passkeyToDelete}
        onOpenChange={(open) => !open && setPasskeyToDelete(null)}
        title={t("account.passkey_deleted_title")}
        description={t("account.delete_passkey_confirm")}
        loading={deletingPasskey}
        onConfirm={handleDeletePasskey}
      >
        {passkeyToDelete && (
          <div className="mt-1 font-medium text-foreground text-sm">
            "{passkeyToDelete.deviceName}"
          </div>
        )}
      </ConfirmModal>
    </div>
  )
}
