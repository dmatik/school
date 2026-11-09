import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { motion } from "framer-motion"
import {
  Plus,
  Shield,
  Key,
  Trash2,
  Edit2,
  Search,
  Loader2,
  AlertTriangle,
  Users,
  Baby,
  X
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
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
        <div data-page-title className="hidden md:flex flex-row justify-between items-center gap-3 border-b border-border/70 dark:border-border/60 pb-2">
          <h2 className="text-lg font-bold tracking-tight text-foreground truncate flex-1 min-w-0">
            {t("admin.title")}
          </h2>
        </div>

        {/* Search & Stats */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder={t("admin.search_placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-11 pe-11 h-11 text-[18px] rounded-full bg-black/[0.05] dark:bg-white/[0.08] border border-transparent shadow-none placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-transparent focus-visible:border-transparent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute end-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 flex items-center justify-center"
              aria-label={t("common.clear_search")}
            >
              <X className="w-4 h-4 stroke-[2.5px]" />
            </button>
          )}
        </div>
        <div className="text-sm text-muted-foreground self-end sm:self-center">
          {t("admin.total_users", { count: users.length })}
        </div>
      </div>

      {/* Users List */}
      <Card className="shadow-sm border border-transparent overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? t("admin.no_users_found") : t("admin.no_users")}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredUsers.map((u) => {
                const isSelf = u.id === currentUser.id
                const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ")

                return (
                  <div
                    key={u.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {u.avatar ? (
                        <img
                          src={u.avatar}
                          alt={u.username}
                          className="w-10 h-10 rounded-full object-cover border border-transparent"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold border border-transparent">
                          {u.username[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {fullName || u.username}
                          </span>
                          {fullName && (
                            <span className="text-xs text-muted-foreground">({u.username})</span>
                          )}
                          {isSelf && (
                            <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-medium border border-transparent">
                              {t("admin.you")}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span
                            className={`inline-flex items-center gap-1 font-medium ${
                              u.role === "admin" ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"
                            }`}
                          >
                            <Shield className="w-3 h-3" />
                            {u.role === "admin" ? t("account.role_admin") : t("account.role_user")}
                          </span>
                          <span className="text-border">•</span>
                          <span
                            className={`inline-flex items-center gap-1 font-medium ${
                              u.familyRole === "child" ? "text-emerald-600 dark:text-emerald-400" : "text-purple-600 dark:text-purple-400"
                            }`}
                          >
                            {u.familyRole === "child" ? (
                              <Baby className="w-3 h-3" />
                            ) : (
                              <Users className="w-3 h-3" />
                            )}
                            {u.familyRole === "child" ? t("admin.role_child") : t("admin.role_parent")}
                          </span>
                          {u.familyRole === "child" && (() => {
                            const linkedChild = webtopChildren.find((c) => c.id === u.linkedChildId)
                            if (linkedChild) {
                              const childName = `${linkedChild.firstName} ${linkedChild.lastName}`.trim() || linkedChild.id
                              return (
                                <>
                                  <span className="text-border">•</span>
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-secondary text-secondary-foreground border border-transparent">
                                    {childName}
                                  </span>
                                </>
                              )
                            }
                            return (
                              <>
                                <span className="text-border">•</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-transparent">
                                  {t("admin.unlinked_child_badge")}
                                </span>
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(u)}
                        title={t("admin.edit_user")}
                        className="h-8 px-2 text-xs flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">{t("common.edit")}</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPasswordDialog(u)}
                        title={t("admin.reset_password")}
                        className="h-8 px-2 text-xs flex items-center gap-1"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">{t("admin.reset_password_short")}</span>
                      </Button>

                      {!isSelf && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUserToDelete(u)}
                          title={t("admin.delete_user")}
                          className="h-8 px-2 text-xs text-destructive hover:text-destructive flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden md:inline">{t("common.delete")}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.create_user_modal_title")}</DialogTitle>
            <DialogDescription>{t("admin.create_user_modal_desc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="flex flex-col flex-1 space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="create-username">{t("auth.username")}</Label>
              <Input
                id="create-username"
                value={createUsername}
                onChange={(e) => setCreateUsername(e.target.value)}
                placeholder={t("auth.username_placeholder")}
                className="bg-muted dark:bg-secondary border-transparent"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">{t("auth.password")}</Label>
              <Input
                id="create-password"
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="••••••••"
                className="bg-muted dark:bg-secondary border-transparent"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="create-fn">{t("account.first_name")}</Label>
                <Input
                  id="create-fn"
                  value={createFirstName}
                  onChange={(e) => setCreateFirstName(e.target.value)}
                  className="bg-muted dark:bg-secondary border-transparent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-ln">{t("account.last_name")}</Label>
                <Input
                  id="create-ln"
                  value={createLastName}
                  onChange={(e) => setCreateLastName(e.target.value)}
                  className="bg-muted dark:bg-secondary border-transparent"
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
                <SelectTrigger id="create-role" className="bg-muted dark:bg-secondary border-transparent">
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
                <SelectTrigger id="create-family-role" className="bg-muted dark:bg-secondary border-transparent" disabled={createRole === "admin"}>
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
                  <SelectTrigger id="create-linked-child" className="bg-muted dark:bg-secondary border-transparent">
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
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="flex-1 sm:flex-none">
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmittingCreate} className="flex-1 sm:flex-none">
                {isSubmittingCreate ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                {t("admin.create_button")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          {(() => {
            const isEditingDefaultAdmin = activeUser?.id === "admin-default" || activeUser?.username?.toLowerCase() === "admin"
            return (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {t("admin.edit_user_modal_title", { username: activeUser?.username })}
                  </DialogTitle>
                  <DialogDescription>{t("admin.edit_user_modal_desc")}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleEditUser} className="flex flex-col flex-1 space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="edit-fn">{t("account.first_name")}</Label>
                      <Input
                        id="edit-fn"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        className="bg-muted dark:bg-secondary border-transparent"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-ln">{t("account.last_name")}</Label>
                      <Input
                        id="edit-ln"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        className="bg-muted dark:bg-secondary border-transparent"
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
                      <SelectTrigger id="edit-role" className="bg-muted dark:bg-secondary border-transparent" disabled={isEditingDefaultAdmin}>
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
                      <SelectTrigger id="edit-family-role" className="bg-muted dark:bg-secondary border-transparent" disabled={editRole === "admin" || isEditingDefaultAdmin}>
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
                        <SelectTrigger id="edit-linked-child" className="bg-muted dark:bg-secondary border-transparent">
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
                  <DialogFooter className="pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="flex-1 sm:flex-none">
                      {t("common.cancel")}
                    </Button>
                    <Button type="submit" disabled={isSubmittingEdit} className="flex-1 sm:flex-none">
                      {isSubmittingEdit ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                      {t("common.save")}
                    </Button>
                  </DialogFooter>
                </form>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("admin.reset_password_modal_title", { username: activeUser?.username })}
            </DialogTitle>
            <DialogDescription>
              {t("admin.reset_password_modal_desc", { username: activeUser?.username })}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="flex flex-col flex-1 space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reset-pass">{t("admin.new_password")}</Label>
              <Input
                id="reset-pass"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-muted dark:bg-secondary border-transparent"
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsPasswordOpen(false)} className="flex-1 sm:flex-none">
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmittingPassword} className="flex-1 sm:flex-none">
                {isSubmittingPassword ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                {t("admin.confirm_reset_password")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Alert Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {t("admin.delete_user_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.delete_user_desc", { username: userToDelete?.username })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="flex-1 sm:flex-none">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex-1 sm:flex-none">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>

      {/* Floating Add User Action Button (Aligned with cards, identical to ExamsPage) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 max-w-3xl mx-auto w-full px-4 md:px-6">
        <div className="relative h-full w-full">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsCreateOpen(true)}
            className="pointer-events-auto absolute z-30 h-[50px] w-[50px] rounded-full bg-primary text-white flex items-center justify-center select-none shadow-md shadow-primary/30 transition-transform focus:outline-none focus-visible:outline-none ltr:end-0 rtl:start-0 md:rtl:start-auto md:end-0 bottom-[calc(max(0.625rem,env(safe-area-inset-bottom)-10px)+5.35rem)] md:bottom-8"
            title={t("admin.add_user_button")}
            aria-label={t("admin.add_user_button")}
          >
            <Plus className="w-[22px] h-[22px] stroke-[2.2px]" />
          </motion.button>
        </div>
      </div>
    </div>
  )
}
