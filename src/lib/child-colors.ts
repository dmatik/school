export interface ChildColorOption {
  id: string
  labelKey: string
  bg: string
  badgeBg: string
  badgeText: string
  badgeBorder: string
}

export const CHILD_COLORS: ChildColorOption[] = [
  {
    id: "blue",
    labelKey: "account.color_blue",
    bg: "bg-blue-500",
    badgeBg: "bg-blue-500/15 dark:bg-blue-500/25",
    badgeText: "text-blue-700 dark:text-blue-300",
    badgeBorder: "border-blue-500/30 dark:border-blue-500/40"
  },
  {
    id: "emerald",
    labelKey: "account.color_emerald",
    bg: "bg-emerald-500",
    badgeBg: "bg-emerald-500/15 dark:bg-emerald-500/25",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    badgeBorder: "border-emerald-500/30 dark:border-emerald-500/40"
  },
  {
    id: "purple",
    labelKey: "account.color_purple",
    bg: "bg-purple-500",
    badgeBg: "bg-purple-500/15 dark:bg-purple-500/25",
    badgeText: "text-purple-700 dark:text-purple-300",
    badgeBorder: "border-purple-500/30 dark:border-purple-500/40"
  },
  {
    id: "amber",
    labelKey: "account.color_amber",
    bg: "bg-amber-500",
    badgeBg: "bg-amber-500/15 dark:bg-amber-500/25",
    badgeText: "text-amber-700 dark:text-amber-300",
    badgeBorder: "border-amber-500/30 dark:border-amber-500/40"
  },
  {
    id: "rose",
    labelKey: "account.color_rose",
    bg: "bg-rose-500",
    badgeBg: "bg-rose-500/15 dark:bg-rose-500/25",
    badgeText: "text-rose-700 dark:text-rose-300",
    badgeBorder: "border-rose-500/30 dark:border-rose-500/40"
  },
  {
    id: "cyan",
    labelKey: "account.color_cyan",
    bg: "bg-cyan-500",
    badgeBg: "bg-cyan-500/15 dark:bg-cyan-500/25",
    badgeText: "text-cyan-700 dark:text-cyan-300",
    badgeBorder: "border-cyan-500/30 dark:border-cyan-500/40"
  },
  {
    id: "orange",
    labelKey: "account.color_orange",
    bg: "bg-orange-500",
    badgeBg: "bg-orange-500/15 dark:bg-orange-500/25",
    badgeText: "text-orange-700 dark:text-orange-300",
    badgeBorder: "border-orange-500/30 dark:border-orange-500/40"
  },
  {
    id: "indigo",
    labelKey: "account.color_indigo",
    bg: "bg-indigo-500",
    badgeBg: "bg-indigo-500/15 dark:bg-indigo-500/25",
    badgeText: "text-indigo-700 dark:text-indigo-300",
    badgeBorder: "border-indigo-500/30 dark:border-indigo-500/40"
  }
]

export function getChildBadgeClasses(colorId?: string | null): string {
  if (!colorId) {
    return "bg-muted/70 text-foreground border-border/60"
  }
  const found = CHILD_COLORS.find(c => c.id === colorId)
  if (found) {
    return `${found.badgeBg} ${found.badgeText} ${found.badgeBorder}`
  }
  return "bg-muted/70 text-foreground border-border/60"
}

export function getChildTextColor(colorId?: string | null): string {
  if (!colorId) {
    return "text-primary"
  }
  const found = CHILD_COLORS.find(c => c.id === colorId)
  if (found) {
    return found.badgeText
  }
  return "text-primary"
}

export function getChildColor(colorId?: string | null): ChildColorOption | undefined {
  return CHILD_COLORS.find(c => c.id === colorId)
}

