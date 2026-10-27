import { useTranslation } from "react-i18next"
import { BookOpen, RefreshCw, Sparkles, GraduationCap } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function HomeworkPage() {
  const { t } = useTranslation()

  return (
    <div className="h-full flex flex-col p-4 md:p-6 overflow-y-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("homework.title")}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("homework.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t("homework.refresh")}</span>
          </Button>
        </div>
      </div>

      {/* Main Container / Placeholder State */}
      <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
        <Card className="w-full max-w-xl border-dashed border-2 shadow-sm bg-card/60">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 shadow-inner">
              <GraduationCap className="w-7 h-7" />
            </div>
            <CardTitle className="text-xl font-bold">
              {t("homework.empty_title")}
            </CardTitle>
            <CardDescription className="text-sm max-w-md mx-auto pt-1">
              {t("homework.empty_desc")}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            <div className="rounded-xl bg-muted/60 p-4 border border-border flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary mt-0.5 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-1 text-start">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-foreground">
                    {t("homework.status_title")}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    {t("homework.integration_badge")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("homework.status_desc")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default HomeworkPage

