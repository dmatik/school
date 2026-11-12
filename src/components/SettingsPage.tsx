import { useState, useEffect, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "next-themes"
import { PageHeader } from "@/components/ui/page-header"
import {
  GraduationCap,
  Loader2,
  Globe,
  Check,
  Palette
} from "lucide-react"
import { SectionCard } from "@/components/ui/section-card"
import { InfoBox, InfoItem } from "@/components/ui/info-box"
import { StatusBadge } from "@/components/ui/status-badge"
import { NoticeBanner } from "@/components/ui/notice-banner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  SelectField,
  SelectItem,
} from "@/components/ui/select"
import { ConfirmModal } from "@/components/ui/modal"
import { toast } from "@/hooks/use-toast"
import { formatGradeHebrew, formatSystemDateTime } from "@/lib/utils"
import { ChildBadge } from "@/components/ui/child-badge"
import { ColorSwatchPicker } from "@/components/ui/color-swatch-picker"
import { FieldLabel, FilledInput } from "@/components/ui/form-field"
import { SyncButton } from "@/components/ui/sync-button"
import { EditButton, DestructiveButton } from "@/components/ui/action-button"
import type { WebtopConfig, User } from "@/types"

interface SettingsPageProps {
  token: string
  currentUser?: User | null
}

export function SettingsPage({ token, currentUser }: SettingsPageProps) {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const isChild = currentUser?.familyRole === "child"

  // Webtop Integration State
  const [webtopConfig, setWebtopConfig] = useState<WebtopConfig | null>(null)
  const [loadingWebtop, setLoadingWebtop] = useState(false)
  const [webtopUsername, setWebtopUsername] = useState("")
  const [webtopPassword, setWebtopPassword] = useState("")
  const [testingWebtop, setTestingWebtop] = useState(false)
  const [savingWebtop, setSavingWebtop] = useState(false)
  const [syncingWebtop, setSyncingWebtop] = useState(false)
  const [syncSuccessWebtop, setSyncSuccessWebtop] = useState(false)
  const syncSuccessTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const [disconnectingWebtop, setDisconnectingWebtop] = useState(false)
  const [isEditingWebtop, setIsEditingWebtop] = useState(false)

  const loadWebtopConfig = useCallback(async () => {
    if (isChild) return
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
  }, [token, isChild])

  useEffect(() => {
    if (!isChild) {
      loadWebtopConfig()
    }
  }, [loadWebtopConfig, isChild])

  useEffect(() => {
    if (isChild) return
    const handleWebtopSynced = () => {
      loadWebtopConfig()
      setSyncSuccessWebtop(true)
      if (syncSuccessTimerRef.current) clearTimeout(syncSuccessTimerRef.current)
      syncSuccessTimerRef.current = setTimeout(() => {
        setSyncSuccessWebtop(false)
      }, 3000)
    }
    window.addEventListener("webtop:synced", handleWebtopSynced)
    return () => {
      window.removeEventListener("webtop:synced", handleWebtopSynced)
      if (syncSuccessTimerRef.current) clearTimeout(syncSuccessTimerRef.current)
    }
  }, [loadWebtopConfig, isChild])

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

      window.dispatchEvent(new CustomEvent("webtop:configured"))
      window.dispatchEvent(new CustomEvent("webtop:synced"))

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
    setSyncSuccessWebtop(false)
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
      setSyncSuccessWebtop(true)
      if (syncSuccessTimerRef.current) clearTimeout(syncSuccessTimerRef.current)
      syncSuccessTimerRef.current = setTimeout(() => {
        setSyncSuccessWebtop(false)
      }, 3000)

      window.dispatchEvent(new CustomEvent("webtop:synced", {
        detail: {
          incidentsCount: data.result?.incidentsCount || 0,
          homeworkCount: data.result?.homeworkCount || 0
        }
      }))
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

      window.dispatchEvent(new CustomEvent("webtop:configured"))
      window.dispatchEvent(new CustomEvent("webtop:synced"))

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
    <div className="h-full flex flex-col pt-[3.75rem] pb-24 px-4 md:pt-6 md:pb-6 md:px-6 overflow-y-auto overscroll-y-contain gap-4 md:gap-6 max-w-3xl mx-auto w-full">
      {/* Page Header (Desktop only) */}
      <PageHeader sticky={false} title={t("settings.title")} />

      <div className="space-y-4">
        {/* Appearance & Language Card */}
        <SectionCard
          icon={Palette}
          title={t("settings.appearance_title")}
          description={t("settings.appearance_desc")}
          contentClassName="pt-2 divide-y divide-border/40"
        >
          {/* Language Selector Row */}
          <SelectField
            id="settings-language-select"
            label={t("settings.language_label")}
            description={t("settings.language_desc")}
            value={(i18n.language || "he").startsWith("en") ? "en" : "he"}
            onValueChange={(val) => i18n.changeLanguage(val)}
            variant="filled"
            triggerProps={{ "data-settings-language-selector": "" }}
          >
            <SelectItem value="he">{t("common.hebrew")}</SelectItem>
            <SelectItem value="en">{t("common.english")}</SelectItem>
          </SelectField>

          {/* Color Theme Selector Row */}
          <SelectField
            id="settings-theme-select"
            label={t("settings.theme_label")}
            description={t("settings.theme_desc")}
            value={theme || "system"}
            onValueChange={(val) => setTheme(val)}
            variant="filled"
            triggerProps={{ "data-settings-theme-selector": "" }}
          >
            <SelectItem value="light">{t("common.light")}</SelectItem>
            <SelectItem value="dark">{t("common.dark")}</SelectItem>
            <SelectItem value="system">{t("common.system")}</SelectItem>
          </SelectField>
        </SectionCard>

        {/* Webtop Integration Card */}
        {!isChild && (
          <SectionCard
            icon={GraduationCap}
            title={t("account.webtop_title")}
            description={t("account.webtop_desc")}
            action={
              loadingWebtop ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : webtopConfig?.configured ? (
                <StatusBadge
                  variant="success"
                  label={t("account.webtop_status_connected")}
                />
              ) : (
                <StatusBadge
                  variant="neutral"
                  label={t("account.webtop_status_not_connected")}
                />
              )
            }
            contentClassName="pt-4"
          >
            {loadingWebtop ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : webtopConfig?.configured && !isEditingWebtop ? (
              <div className="space-y-5">
                {/* Connected Info Grid */}
                <InfoBox columns={2}>
                  <InfoItem
                    label={t("account.webtop_username")}
                    value={webtopConfig.username}
                  />
                  <InfoItem
                    label={t("account.webtop_last_synced", { date: "" }).replace(":", "")}
                    value={
                      webtopConfig.lastSyncedAt
                        ? formatSystemDateTime(webtopConfig.lastSyncedAt)
                        : "-"
                    }
                    isLtr={Boolean(webtopConfig.lastSyncedAt)}
                    valueClassName="text-xs font-medium"
                  />
                </InfoBox>

                {/* Sync Error Alert if any */}
                {webtopConfig.syncError && (
                  <NoticeBanner
                    variant="destructive"
                    description={`${t("account.webtop_status_error")}: ${webtopConfig.syncError}`}
                  />
                )}

                {/* Linked Kids Color Selection */}
                {webtopConfig.linkedChildren && webtopConfig.linkedChildren.length > 0 && (
                  <div className="space-y-3 pt-1">
                    <FieldLabel
                      label={t("account.webtop_linked_kids_title")}
                      description={t("account.webtop_linked_kids_desc")}
                    />

                    <div className="space-y-2.5">
                      {webtopConfig.linkedChildren.map((child) => {
                        const childFullName = `${child.firstName} ${child.lastName}`.trim()

                        return (
                          <InfoBox
                            key={child.id}
                            columns={1}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <ChildBadge
                                name={childFullName}
                                colorId={child.color}
                                variant="solid"
                                size="sm"
                              />
                              {child.classCode && (
                                <span className="text-xs text-muted-foreground">
                                  ({t("account.class_label", {
                                    code: formatGradeHebrew(child.classCode),
                                    num: child.classNum
                                  })})
                                </span>
                              )}
                            </div>

                            <ColorSwatchPicker
                              selectedColorId={child.color}
                              onSelectColor={(colId) => handleUpdateChildColor(child.id, colId)}
                              clearPosition="end"
                            />
                          </InfoBox>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <SyncButton
                      variant="outline"
                      onClick={handleSyncWebtop}
                      syncing={syncingWebtop}
                      success={syncSuccessWebtop}
                    />

                    <EditButton onClick={() => setIsEditingWebtop(true)} />
                  </div>

                  <DestructiveButton onClick={() => setShowDisconnectDialog(true)}>
                    {t("account.webtop_disconnect")}
                  </DestructiveButton>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveWebtop} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="webtopUser">{t("account.webtop_username")}</Label>
                    <FilledInput
                      id="webtopUser"
                      value={webtopUsername}
                      onChange={(e) => setWebtopUsername(e.target.value)}
                      placeholder={t("account.webtop_username_placeholder")}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="webtopPass">{t("account.webtop_password")}</Label>
                    <FilledInput
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
          </SectionCard>
        )}
      </div>

      {/* Disconnect Webtop Confirmation Dialog */}
      {!isChild && (
        <ConfirmModal
          open={showDisconnectDialog}
          onOpenChange={setShowDisconnectDialog}
          title={t("account.webtop_disconnect")}
          description={t("account.webtop_disconnect_confirm")}
          confirmText={t("common.delete")}
          cancelText={t("common.cancel")}
          loading={disconnectingWebtop}
          onConfirm={handleDisconnectWebtop}
        />
      )}
    </div>
  )
}

