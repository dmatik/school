import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Lock, User as UserIcon, Loader2, Fingerprint } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ModeToggle } from "@/components/mode-toggle"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { isPasskeySupported, loginWithPasskey } from "@/lib/webauthn"
import type { User } from "@/types"

interface LoginViewProps {
  onLoginSuccess: (token: string, user: User) => void
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const { t } = useTranslation()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [hasPasskeySupport, setHasPasskeySupport] = useState(false)

  useEffect(() => {
    setHasPasskeySupport(isPasskeySupported())
  }, [])

  const handlePasskeyLogin = async () => {
    setError(null)
    setPasskeyLoading(true)
    try {
      const result = await loginWithPasskey(username.trim() || undefined)
      onLoginSuccess(result.token, result.user)
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      if (errorObj.name !== 'NotAllowedError') {
        setError(errorObj.message || t("auth.passkey_failed"))
      }
    } finally {
      setPasskeyLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password
        })
      })

      const isJson = res.headers.get("content-type")?.includes("application/json")
      const data = isJson ? await res.json().catch(() => null) : null
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error(t("auth.login_failed"))
        }
        throw new Error(data?.message || data?.error || t("auth.login_failed"))
      }

      onLoginSuccess(data.token, data.user)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message || t("auth.login_failed"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 w-full overflow-y-auto overscroll-y-contain flex flex-col justify-center items-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      {/* Top Controls */}
      <div className="absolute top-[calc(env(safe-area-inset-top,0px)+1rem)] end-4 flex items-center gap-2">
        <LanguageSwitcher />
        <ModeToggle />
      </div>

      <Card className="w-full max-w-md rounded-2xl shadow-xl border border-border/70 dark:border-border/60 bg-card/90 backdrop-blur-md">
        <CardHeader className="text-center space-y-2 pb-5">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2 shadow-xs">
            <UserIcon className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent tracking-tight">
            {t("common.app_title")}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground font-medium">
            {t("auth.login_subtitle")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {error && (
              <div className="p-2.5 text-xs font-medium rounded-lg bg-destructive/15 text-destructive border border-destructive/20 text-center animate-in fade-in">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-semibold">{t("auth.username")}</Label>
              <div className="relative">
                <UserIcon className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  className="ps-9 h-9 text-sm rounded-lg border-border/80 focus-visible:ring-1 focus-visible:ring-primary/40"
                  placeholder={t("auth.username_placeholder")}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold">{t("auth.password")}</Label>
              <div className="relative">
                <Lock className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="ps-9 h-9 text-sm rounded-lg border-border/80 focus-visible:ring-1 focus-visible:ring-primary/40"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full mt-4 h-9 rounded-lg font-semibold shadow-xs hover:shadow-sm transition-all duration-200" disabled={loading || passkeyLoading}>
              {loading ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t("auth.logging_in")}
                </>
              ) : (
                t("auth.login_button")
              )}
            </Button>

            {hasPasskeySupport && (
              <>
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/60" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-[10px] font-semibold text-muted-foreground">{t("auth.or_use_password")}</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePasskeyLogin}
                  disabled={loading || passkeyLoading}
                  className="w-full h-9 rounded-lg border-primary/25 hover:bg-primary/5 hover:border-primary/40 text-foreground text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all duration-200"
                >
                  {passkeyLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t("auth.logging_in")}</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="h-4 w-4 text-primary" />
                      <span>{t("auth.login_with_passkey")}</span>
                    </>
                  )}
                </Button>
              </>
            )}

            <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border/40">
              {t("auth.default_credentials_hint")}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

