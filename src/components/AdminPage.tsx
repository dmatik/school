import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/ui/page-header"
import { SearchInput } from "@/components/ui/search-input"
import {
  Loader2,
  AlertTriangle,
  Users
} from "lucide-react"
import { SectionCard } from "@/components/ui/section-card"
import { Separator } from "@/components/ui/separator"
import { AdminUserRow } from "@/components/ui/admin-user-row"
import { FilledInput } from "@/components/ui/form-field"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Modal, ConfirmModal } from "@/components/ui/modal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { FloatingActionButton } from "@/components/ui/floating-action-button"
import type { User, UserRole, FamilyRole, WebtopChild } from "@/types"

interface AdminPageProps {
  currentUser: User
  token: string
}

export function AdminPage({ currentUser, token }: AdminPageProps) {
  const { t } = useTranslation()
  const [users, setUsers] = useState<User[]>([])
  const [webtopChildren, setWebtopChildren] = useState<WebtopChild[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [activeUser, setActiveUser] = useState<User | null>(null)

  // Form states for Create User
  const [createUsername, setCreateUsername] = useState("")
  const [createPassword, setCreatePassword] = useState("")
  const [createFirstName, setCreateFirstName] = useState("")
  const [createLastName, setCreateLastName] = useState("")
  const [createRole, setCreateRole] = useState<UserRole>("user")
  const [createFamilyRole, setCreateFamilyRole] = useState<FamilyRole>("parent")
  const [createLinkedChildId, setCreateLinkedChildId] = useState<string>("")
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false)

  // Form states for Edit User
  const [editFirstName, setEditFirstName] = useState("")
  const [editLastName, setEditLastName] = useState("")
  const [editRole, setEditRole] = useState<UserRole>("user")
  const [editFamilyRole, setEditFamilyRole] = useState<FamilyRole>("parent")
  const [editLinkedChildId, setEditLinkedChildId] = useState<string>("")
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)

  // Form states for Reset Password
  const [resetPassword, setResetPassword] = useState("")
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false)

  // Helper to extract localized error messages safely from responses
  const getErrorMessage = useCallback(async (res: Response, fallbackKey: string) => {
    let data: { error?: string; users?: User[] } | null = null
    try {
      const isJson = res.headers.get("content-type")?.includes("application/json")
      if (isJson) {
        data = await res.json()
      } else {
        const text = await res.text()
        try {
          data = JSON.parse(text)
        } catch {
          // not json
        }
      }
    } catch {
      // ignore
    }

    const err = data?.error
    if (!err) return t(fallbackKey)

    if (err === "cannot_demote_default_admin") {
      return t("admin.cannot_demote_default_admin")
    }
    if (err === "cannot_demote_sole_admin" || err === "Cannot remove admin role from the only remaining admin") {
      return t("admin.cannot_demote_sole_admin")
    }
    if (err === "cannot_delete_sole_admin") {
      return t("admin.cannot_delete_sole_admin")
    }
    if (err === "cannot_delete_self" || err === "Cannot delete your own account") {
      return t("admin.cannot_delete_self")
    }
    if (err === "username_taken" || err === "A user with this username already exists") {
      return t("admin.username_taken")
    }
    if (err === "admin_must_be_parent") {
      return t("admin.admin_must_be_parent")
    }

    const translated = t(`admin.${err}`)
    if (translated && translated !== `admin.${err}`) return translated

    return err || t(fallbackKey)
  }, [t])

  // Fetch Users & Webtop Children
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const [usersRes, configRes] = await Promise.all([
        fetch("/api/admin/users", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }),
        fetch("/api/webtop/config", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      ])

      if (!usersRes.ok) {
        const msg = await getErrorMessage(usersRes, "admin.fetch_failed")
        throw new Error(msg)
      }
      const data = await usersRes.json()
      setUsers(data.users || [])

      if (configRes.ok) {
        const configData = await configRes.json()
        setWebtopChildren(configData.linkedChildren || [])
      }
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("admin.fetch_failed")
      })
    } finally {
      setLoading(false)
    }
  }, [token, t, getErrorMessage])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingCreate(true)

    try {
      const payloadRole = createRole
      const payloadFamilyRole = payloadRole === "admin" ? "parent" : createFamilyRole
      const payloadLinkedChildId = payloadFamilyRole === "child" ? (createLinkedChildId || null) : null

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: createUsername,
          password: createPassword,
          firstName: createFirstName,
          lastName: createLastName,
          role: payloadRole,
          familyRole: payloadFamilyRole,
          linkedChildId: payloadLinkedChildId
        })
      })

      if (!res.ok) {
        const msg = await getErrorMessage(res, "admin.create_failed")
        throw new Error(msg)
      }

      toast({
        variant: "success",
        title: t("admin.user_created_title"),
        description: t("admin.user_created_desc", { username: createUsername })
      })

      setIsCreateOpen(false)
      setCreateUsername("")
      setCreatePassword("")
      setCreateFirstName("")
      setCreateLastName("")
      setCreateRole("user")
      setCreateFamilyRole("parent")
      setCreateLinkedChildId("")
      fetchUsers()
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("admin.create_failed")
      })
    } finally {
      setIsSubmittingCreate(false)
    }
  }

  // Open Edit User Dialog
  const openEditDialog = (u: User) => {
    setActiveUser(u)
    setEditFirstName(u.firstName || "")
    setEditLastName(u.lastName || "")
    setEditRole(u.role)
    setEditFamilyRole(u.role === "admin" ? "parent" : (u.familyRole || "parent"))
    setEditLinkedChildId(u.linkedChildId || "")
    setIsEditOpen(true)
  }

  // Handle Edit User
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeUser) return
    setIsSubmittingEdit(true)

    try {
      const isDefaultAdmin = activeUser.id === "admin-default" || activeUser.username.toLowerCase() === "admin"
      const payloadRole = isDefaultAdmin ? "admin" : editRole
      const payloadFamilyRole = payloadRole === "admin" ? "parent" : editFamilyRole
      const payloadLinkedChildId = payloadFamilyRole === "child" ? (editLinkedChildId || null) : null

      const res = await fetch(`/api/admin/users/${activeUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          role: payloadRole,
          familyRole: payloadFamilyRole,
          linkedChildId: payloadLinkedChildId
        })
      })

      if (!res.ok) {
        const msg = await getErrorMessage(res, "admin.update_failed")
        throw new Error(msg)
      }

      toast({
        variant: "success",
        title: t("admin.user_updated_title"),
        description: t("admin.user_updated_desc", { username: activeUser.username })
      })

      setIsEditOpen(false)
      fetchUsers()
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("admin.update_failed")
      })
    } finally {
      setIsSubmittingEdit(false)
    }
  }

  // Open Reset Password Dialog
  const openPasswordDialog = (u: User) => {
    setActiveUser(u)
    setResetPassword("")
    setIsPasswordOpen(true)
  }

  // Handle Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeUser) return

    if (resetPassword.length < 4) {
      toast({
        variant: "destructive",
        title: t("account.password_too_short_title"),
        description: t("account.password_too_short_desc")
      })
      return
    }

    setIsSubmittingPassword(true)

    try {
      const res = await fetch(`/api/admin/users/${activeUser.id}/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          password: resetPassword
        })
      })

      if (!res.ok) {
        const msg = await getErrorMessage(res, "admin.password_reset_failed")
        throw new Error(msg)
      }

      toast({
        variant: "success",
        title: t("admin.password_reset_title"),
        description: t("admin.password_reset_desc", { username: activeUser.username })
      })

      setIsPasswordOpen(false)
      setResetPassword("")
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("admin.password_reset_failed")
      })
    } finally {
      setIsSubmittingPassword(false)
    }
  }

  // Handle Delete User
  const handleDeleteUser = async () => {
    if (!userToDelete) return

    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!res.ok) {
        const msg = await getErrorMessage(res, "admin.delete_failed")
        throw new Error(msg)
      }

      toast({
        variant: "success",
        title: t("admin.user_deleted_title"),
        description: t("admin.user_deleted_desc", { username: userToDelete.username })
      })

      setUserToDelete(null)
      fetchUsers()
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("admin.delete_failed")
      })
    }
  }

  // Filtered users
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return users
    return users.filter((u) => {
      return (
        u.username.toLowerCase().includes(q) ||
        (u.firstName && u.firstName.toLowerCase().includes(q)) ||
        (u.lastName && u.lastName.toLowerCase().includes(q))
      )
    })
  }, [users, searchQuery])

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="h-full flex flex-col pt-[3.75rem] pb-[calc(max(0.625rem,env(safe-area-inset-bottom)-10px)+10rem)] px-4 md:pt-6 md:pb-28 md:px-6 overflow-y-auto overscroll-y-contain gap-4 md:gap-6 max-w-3xl mx-auto w-full">
        {/* Page Header (Desktop only) */}
        <PageHeader sticky={false} title={t("admin.title")} />

        {/* Search */}
        <div>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t("admin.search_placeholder")}
            wrapperClassName="w-full"
          />
        </div>

        {/* Users List Section Card */}
        <div className="space-y-4">
          <SectionCard
            icon={Users}
            title={t("admin.users_section_title")}
            description={t("admin.total_users", { count: users.length })}
            contentClassName="pt-1"
          >
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery ? t("admin.no_users_found") : t("admin.no_users")}
              </div>
            ) : (
              filteredUsers.map((u, index) => {
                const linkedChild = webtopChildren.find((c) => c.id === u.linkedChildId)
                return (
                  <div key={u.id}>
                    {index > 0 && <Separator className="my-0" />}
                    <AdminUserRow
                      user={u}
                      isSelf={u.id === currentUser.id}
                      linkedChild={
                        linkedChild
                          ? {
                              id: linkedChild.id,
                              name: `${linkedChild.firstName} ${linkedChild.lastName}`.trim() || linkedChild.id,
                              color: linkedChild.color,
                            }
                          : null
                      }
                      onEdit={() => openEditDialog(u)}
                      onResetPassword={() => openPasswordDialog(u)}
                      onDelete={u.id !== currentUser.id ? () => setUserToDelete(u) : undefined}
                    />
                  </div>
                )
              })
            )}
          </SectionCard>
        </div>

      {/* Create User Dialog */}
      <Modal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title={t("admin.create_user_modal_title")}
        description={t("admin.create_user_modal_desc")}
        onSubmit={handleCreateUser}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="flex-1 sm:flex-none">
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmittingCreate} className="flex-1 sm:flex-none">
              {isSubmittingCreate ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
              {t("admin.create_button")}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="create-username">{t("auth.username")}</Label>
          <FilledInput
            id="create-username"
            value={createUsername}
            onChange={(e) => setCreateUsername(e.target.value)}
            placeholder={t("auth.username_placeholder")}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-password">{t("auth.password")}</Label>
          <FilledInput
            id="create-password"
            type="password"
            value={createPassword}
            onChange={(e) => setCreatePassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="create-fn">{t("account.first_name")}</Label>
            <FilledInput
              id="create-fn"
              value={createFirstName}
              onChange={(e) => setCreateFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-ln">{t("account.last_name")}</Label>
            <FilledInput
              id="create-ln"
              value={createLastName}
              onChange={(e) => setCreateLastName(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-role">{t("account.role")}</Label>
          <Select
            value={createRole}
            onValueChange={(val: UserRole) => {
              setCreateRole(val)
              if (val === "admin") {
                setCreateFamilyRole("parent")
                setCreateLinkedChildId("")
              }
            }}
          >
            <SelectTrigger id="create-role" variant="filled">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">{t("account.role_user")}</SelectItem>
              <SelectItem value="admin">{t("account.role_admin")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-family-role">{t("admin.family_role")}</Label>
          <Select
            value={createFamilyRole}
            onValueChange={(val: FamilyRole) => {
              setCreateFamilyRole(val)
              if (val === "parent") {
                setCreateLinkedChildId("")
              }
            }}
            disabled={createRole === "admin"}
          >
            <SelectTrigger id="create-family-role" variant="filled" disabled={createRole === "admin"}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="parent">{t("admin.role_parent")}</SelectItem>
              <SelectItem value="child">{t("admin.role_child")}</SelectItem>
            </SelectContent>
          </Select>
          {createRole === "admin" && (
            <p className="text-xs text-muted-foreground">
              {t("admin.admin_parent_only_hint")}
            </p>
          )}
        </div>
        {createFamilyRole === "child" && createRole !== "admin" && (
          <div className="space-y-2">
            <Label htmlFor="create-linked-child">{t("admin.linked_child")}</Label>
            <Select
              value={createLinkedChildId || "none"}
              onValueChange={(val) => {
                const childId = val === "none" ? "" : val
                setCreateLinkedChildId(childId)
                if (childId) {
                  const matched = webtopChildren.find((c) => c.id === childId)
                  if (matched && !createFirstName && !createLastName) {
                    if (matched.firstName) setCreateFirstName(matched.firstName)
                    if (matched.lastName) setCreateLastName(matched.lastName)
                  }
                }
              }}
            >
              <SelectTrigger id="create-linked-child" variant="filled">
                <SelectValue placeholder={t("admin.select_child_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("admin.select_child_placeholder")}</SelectItem>
                {webtopChildren.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.firstName} {child.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {webtopChildren.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {t("admin.no_webtop_children_hint")}
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Edit User Dialog */}
      {(() => {
        const isEditingDefaultAdmin = activeUser?.id === "admin-default" || activeUser?.username?.toLowerCase() === "admin"
        return (
          <Modal
            open={isEditOpen}
            onOpenChange={setIsEditOpen}
            title={t("admin.edit_user_modal_title", { username: activeUser?.username })}
            description={t("admin.edit_user_modal_desc")}
            onSubmit={handleEditUser}
            footer={
              <>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="flex-1 sm:flex-none">
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmittingEdit} className="flex-1 sm:flex-none">
                  {isSubmittingEdit ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                  {t("common.save")}
                </Button>
              </>
            }
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-fn">{t("account.first_name")}</Label>
                <FilledInput
                  id="edit-fn"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ln">{t("account.last_name")}</Label>
                <FilledInput
                  id="edit-ln"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">{t("account.role")}</Label>
              <Select
                value={isEditingDefaultAdmin ? "admin" : editRole}
                onValueChange={(val: UserRole) => {
                  setEditRole(val)
                  if (val === "admin") {
                    setEditFamilyRole("parent")
                    setEditLinkedChildId("")
                  }
                }}
                disabled={isEditingDefaultAdmin}
              >
                <SelectTrigger id="edit-role" variant="filled" disabled={isEditingDefaultAdmin}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{t("account.role_user")}</SelectItem>
                  <SelectItem value="admin">{t("account.role_admin")}</SelectItem>
                </SelectContent>
              </Select>
              {isEditingDefaultAdmin && (
                <p className="text-xs text-muted-foreground">
                  {t("admin.default_admin_role_fixed")}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-family-role">{t("admin.family_role")}</Label>
              <Select
                value={editRole === "admin" || isEditingDefaultAdmin ? "parent" : editFamilyRole}
                onValueChange={(val: FamilyRole) => {
                  setEditFamilyRole(val)
                  if (val === "parent") {
                    setEditLinkedChildId("")
                  }
                }}
                disabled={editRole === "admin" || isEditingDefaultAdmin}
              >
                <SelectTrigger id="edit-family-role" variant="filled" disabled={editRole === "admin" || isEditingDefaultAdmin}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">{t("admin.role_parent")}</SelectItem>
                  <SelectItem value="child">{t("admin.role_child")}</SelectItem>
                </SelectContent>
              </Select>
              {(editRole === "admin" || isEditingDefaultAdmin) && (
                <p className="text-xs text-muted-foreground">
                  {t("admin.admin_parent_only_hint")}
                </p>
              )}
            </div>
            {editFamilyRole === "child" && editRole !== "admin" && !isEditingDefaultAdmin && (
              <div className="space-y-2">
                <Label htmlFor="edit-linked-child">{t("admin.linked_child")}</Label>
                <Select
                  value={editLinkedChildId || "none"}
                  onValueChange={(val) => {
                    const childId = val === "none" ? "" : val
                    setEditLinkedChildId(childId)
                  }}
                >
                  <SelectTrigger id="edit-linked-child" variant="filled">
                    <SelectValue placeholder={t("admin.select_child_placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("admin.select_child_placeholder")}</SelectItem>
                    {webtopChildren.map((child) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.firstName} {child.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {webtopChildren.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("admin.no_webtop_children_hint")}
                  </p>
                )}
              </div>
            )}
          </Modal>
        )
      })()}

      {/* Reset Password Dialog */}
      <Modal
        open={isPasswordOpen}
        onOpenChange={setIsPasswordOpen}
        title={t("admin.reset_password_modal_title", { username: activeUser?.username })}
        description={t("admin.reset_password_modal_desc", { username: activeUser?.username })}
        onSubmit={handleResetPassword}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsPasswordOpen(false)} className="flex-1 sm:flex-none">
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmittingPassword} className="flex-1 sm:flex-none">
              {isSubmittingPassword ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
              {t("admin.confirm_reset_password")}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="reset-pass">{t("admin.new_password")}</Label>
          <FilledInput
            id="reset-pass"
            type="password"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
      </Modal>

      {/* Delete User Alert Dialog */}
      <ConfirmModal
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
        icon={AlertTriangle}
        title={t("admin.delete_user_title")}
        description={t("admin.delete_user_desc", { username: userToDelete?.username })}
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        onConfirm={handleDeleteUser}
      />
      </div>

      {/* Floating Add User Action Button (Aligned with cards, identical to ExamsPage) */}
      <FloatingActionButton
        onClick={() => setIsCreateOpen(true)}
        title={t("admin.add_user_button")}
        ariaLabel={t("admin.add_user_button")}
      />
    </div>
  )
}
