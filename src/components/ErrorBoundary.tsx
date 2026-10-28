import React, { Component, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const isRtl = typeof document !== "undefined" && document.documentElement.dir === "rtl"

      return (
        <div
          dir={isRtl ? "rtl" : "ltr"}
          className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-background text-foreground"
        >
          <div className="max-w-md w-full bg-card border rounded-2xl p-6 sm:p-8 shadow-lg text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                {isRtl ? "אירעה שגיאה בלתי צפויה" : "Something went wrong"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isRtl
                  ? "התרחשה שגיאה בטעינת היישום. מומלץ לטעון את העמוד מחדש."
                  : "An unexpected error occurred in the application. Please reload the page."}
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-muted/50 rounded-lg text-xs font-mono text-muted-foreground text-start overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <Button onClick={this.handleReload} className="w-full gap-2">
              <RefreshCw className="w-4 h-4" />
              <span>{isRtl ? "טען מחדש" : "Reload Application"}</span>
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

