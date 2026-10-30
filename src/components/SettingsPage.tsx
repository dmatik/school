import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import {
  Settings,
  GraduationCap,
  Loader2,
  CheckCircle2,
  Globe,
  AlertCircle,
  RefreshCw,
  Edit2,
  Trash2,
  Check
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
import { toast } from "@/hooks/use-toast"
import { cn, formatGradeHebrew, formatSystemDateTime } from "@/lib/utils"
import { CHILD_COLORS, getChildBadgeClasses } from "@/lib/child-colors"
import type { WebtopConfig } from "@/types"

interface SettingsPageProps {
  token: string
}

export function SettingsPage({ token }: SettingsPageProps) {
  const { t } = useTranslation()

  // Webtop Integration State
  const [webtopConfig, setWebtopConfig] = useState<WebtopConfig | null>(null)
  const [loadingWebtop, setLoadingWebtop] = useState(false)
  const [webtopUsername, setWebtopUsername] = useState("")
  const [webtopPassword, setWebtopPassword] = useState("")
  const [testingWebtop, setTestingWebtop] = useState(false)
  const [savingWebtop, setSavingWebtop] = useState(false)
  const [syncingWebtop, setSyncingWebtop] = useState(false)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const [disconnectingWebtop, setDisconnectingWebtop] = useState(false)
  const [isEditingWebtop, setIsEditingWebtop] = useState(false)

  const loadWebtopConfig = useCallback(async () => {
    setLoadingWebtop(true)
    try {
      const res = await fetch("/api/webtop/config", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data: WebtopConfig = await res.json()
        setWebtopConfig(data)
        if (data.username) {
          setWebtopUsername(data.username)
        }
      }
    } catch (err) {
      console.error("Failed to load Webtop config:", err)
    } finally {
      setLoadingWebtop(false)
    }
  }, [token])

  useEffect(() => {
    loadWebtopConfig()
  }, [loadWebtopConfig])

  const handleTestWebtop = async () => {
    if (!webtopUsername || !webtopPassword) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("account.webtop_username_placeholder")
      })
      return
    }

    setTestingWebtop(true)
    try {
      const res = await fetch("/api/webtop/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: webtopUsername,
          password: webtopPassword
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || t("account.webtop_test_failed", { error: "Unknown error" }))
      }

      toast({
        variant: "success",
        title: t("common.confirm"),
        description: t("account.webtop_test_success", { count: data.children?.length || 0 })
      })
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("account.webtop_test_failed", { error: "" })
      })
    } finally {
      setTestingWebtop(false)
    }
  }

  const handleSaveWebtop = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!webtopUsername || !webtopPassword) return

    setSavingWebtop(true)
    try {
      const res = await fetch("/api/webtop/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: webtopUsername,
          password: webtopPassword,
          selectedChildId: webtopConfig?.selectedChildId
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || t("account.webtop_save_failed"))
      }

      setIsEditingWebtop(false)
      setWebtopPassword("")
      await loadWebtopConfig()

      toast({
        variant: "success",
        title: t("account.webtop_saved_success"),
        description: data.syncResult ? t("account.webtop_sync_success", {
          incidents: data.syncResult.incidentsCount,
          homework: data.syncResult.homeworkCount
        }) : undefined
      })
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("account.webtop_save_failed")
      })
    } finally {
      setSavingWebtop(false)
    }
  }

  const handleSyncWebtop = async () => {
    setSyncingWebtop(true)
    try {
      const res = await fetch("/api/webtop/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || t("account.webtop_sync_failed", { error: "Unknown" }))
      }

      await loadWebtopConfig()
      toast({
        variant: "success",
        title: t("common.confirm"),
        description: t("account.webtop_sync_success", {
          incidents: data.result?.incidentsCount || 0,
          homework: data.result?.homeworkCount || 0
        })
      })
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("account.webtop_sync_failed", { error: "" })
      })
    } finally {
      setSyncingWebtop(false)
    }
  }

  const handleUpdateChildColor = async (childId: string, color: string | null) => {
    try {
      const res = await fetch("/api/webtop/child-color", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ childId, color })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || t("account.color_update_failed"))
      }

      setWebtopConfig(prev => {
        if (!prev) return prev
        return {
          ...prev,
          linkedChildren: data.linkedChildren || prev.linkedChildren.map(c =>
            c.id === childId ? { ...c, color } : c
          )
        }
      })

      const child = webtopConfig?.linkedChildren.find(c => c.id === childId)
      toast({
        variant: "success",
        title: t("common.confirm"),
        description: t("account.child_color_updated", { name: child ? `${child.firstName} ${child.lastName}` : "" })
      })
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("account.color_update_failed")
      })
    }
  }

  const handleDisconnectWebtop = async () => {
    setDisconnectingWebtop(true)
    try {
      const res = await fetch("/api/webtop/config", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) throw new Error(t("account.disconnect_failed"))

      setShowDisconnectDialog(false)
      setIsEditingWebtop(false)
      setWebtopUsername("")
      setWebtopPassword("")
      await loadWebtopConfig()

      toast({
        variant: "success",
        title: t("common.confirm"),
        description: t("account.webtop_disconnected_success")
      })
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("account.disconnect_failed")
      })
    } finally {
      setDisconnectingWebtop(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto overscroll-y-contain p-4 md:p-8 pb-8 max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/70 dark:border-border/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-xs">
            <Settings className="w-4 h-4" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-foreground truncate">
            {t("settings.title")}
          </h1>
        </div>
      </div>

      <div className="space-y-4">
        {/* Webtop Integration Card */}
        <Card className="shadow-xs border border-border/70 dark:border-border/60 rounded-xl">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b">
            <div className="space-y-1 min-w-0">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>{t("account.webtop_title")}</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t("account.webtop_desc")}
              </CardDescription>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2">
              {loadingWebtop ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : webtopConfig?.configured ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t("account.webtop_status_connected")}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border">
                  <Globe className="w-3.5 h-3.5" />
                  <span>{t("account.webtop_status_not_connected")}</span>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {loadingWebtop ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : webtopConfig?.configured && !isEditingWebtop ? (
              <div className="space-y-5">
                {/* Connected Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/40 dark:bg-secondary/80 border border-border/60 dark:border-border/60">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block">{t("account.webtop_username")}</span>
                    <span className="text-sm font-semibold text-foreground block">{webtopConfig.username}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block">
                      {t("account.webtop_last_synced", { date: "" }).replace(":", "")}
                    </span>
                    <span className="text-xs font-medium text-foreground block tabular-nums">
                      {webtopConfig.lastSyncedAt ? (
                        <bdi dir="ltr" className="inline-block">
                          {formatSystemDateTime(webtopConfig.lastSyncedAt)}
                        </bdi>
                      ) : (
                        "-"
                      )}
                    </span>
                  </div>
                </div>

                {/* Sync Error Alert if any */}
                {webtopConfig.syncError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{t("account.webtop_status_error")}: {webtopConfig.syncError}</span>
                  </div>
                )}

                {/* Linked Kids Color Selection */}
                {webtopConfig.linkedChildren && webtopConfig.linkedChildren.length > 0 && (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-foreground block">
                        {t("account.webtop_linked_kids_title")}
                      </span>
                      <span className="text-xs text-muted-foreground block">
                        {t("account.webtop_linked_kids_desc")}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {webtopConfig.linkedChildren.map((child) => {
                        const childFullName = `${child.firstName} ${child.lastName}`.trim()
                        const childBadgeClass = getChildBadgeClasses(child.color)

                        return (
                          <div
                            key={child.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-muted/40 dark:bg-secondary/80 border border-border/60 dark:border-border/60 shadow-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={cn(
                                  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border transition-all",
                                  childBadgeClass
                                )}
                              >
                                {childFullName}
                              </span>
                              {child.classCode && (
                                <span className="text-xs text-muted-foreground">
                                  ({t("account.class_label", {
                                    code: formatGradeHebrew(child.classCode),
                                    num: child.classNum
                                  })})
                                </span>
                              )}
                            </div>

                            {/* Color selection buttons */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Default / No Color button */}
                              <button
                                type="button"
                                title={t("account.color_default")}
                                onClick={() => handleUpdateChildColor(child.id, null)}
                                className={cn(
                                  "w-6 h-6 rounded-full border flex items-center justify-center text-[10px] transition-all hover:scale-110",
                                  !child.color
                                    ? "border-primary bg-primary/10 text-primary font-bold ring-2 ring-primary/30"
                                    : "border-border/80 bg-muted/40 text-muted-foreground"
                                )}
                              >
                                ✕
                              </button>

                              {CHILD_COLORS.map((col) => {
                                const isSelected = child.color === col.id
                                return (
                                  <button
                                    key={col.id}
                                    type="button"
                                    title={t(col.labelKey)}
                                    onClick={() => handleUpdateChildColor(child.id, col.id)}
                                    className={cn(
                                      "w-6 h-6 rounded-full transition-all hover:scale-110 shadow-xs",
                                      col.bg,
                                      isSelected
                                        ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                                        : "opacity-75 hover:opacity-100"
                                    )}
                                  />
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSyncWebtop}
                      disabled={syncingWebtop}
                      className="text-xs flex items-center gap-1.5"
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5", syncingWebtop && "animate-spin")} />
                      <span>{syncingWebtop ? t("account.webtop_syncing") : t("account.webtop_sync_button")}</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingWebtop(true)}
                      className="text-xs flex items-center gap-1.5 text-muted-foreground"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{t("common.edit")}</span>
                    </Button>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDisconnectDialog(true)}
                    className="text-xs text-destructive hover:text-destructive flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t("account.webtop_disconnect")}</span>
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveWebtop} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="webtopUser">{t("account.webtop_username")}</Label>
                    <Input
                      id="webtopUser"
                      value={webtopUsername}
                      onChange={(e) => setWebtopUsername(e.target.value)}
                      placeholder={t("account.webtop_username_placeholder")}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="webtopPass">{t("account.webtop_password")}</Label>
                    <Input
                      id="webtopPass"
                      type="password"
                      value={webtopPassword}
                      onChange={(e) => setWebtopPassword(e.target.value)}
                      placeholder={t("account.webtop_password_placeholder")}
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTestWebtop}
                      disabled={testingWebtop || !webtopUsername || !webtopPassword}
                      className="text-xs flex items-center gap-1.5"
                    >
                      {testingWebtop ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{t("account.webtop_testing")}</span>
                        </>
                      ) : (
                        <>
                          <Globe className="w-3.5 h-3.5" />
                          <span>{t("account.webtop_test_button")}</span>
                        </>
                      )}
                    </Button>

                    {isEditingWebtop && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsEditingWebtop(false)
                          setWebtopPassword("")
                        }}
                        className="text-xs"
                      >
                        {t("common.cancel")}
                      </Button>
                    )}
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={savingWebtop || !webtopUsername || !webtopPassword}
                    className="text-xs flex items-center gap-1.5"
                  >
                    {savingWebtop ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{t("account.webtop_saving")}</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{t("account.webtop_save_button")}</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Disconnect Webtop Confirmation Dialog */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("account.webtop_disconnect")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("account.webtop_disconnect_confirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row items-center justify-end gap-2 pt-2">
            <AlertDialogCancel disabled={disconnectingWebtop}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnectWebtop}
              disabled={disconnectingWebtop}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disconnectingWebtop ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

