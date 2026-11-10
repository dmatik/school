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
    bg: "bg-[#3B82C4]",
    badgeBg: "bg-[#D4E6F9] dark:bg-[#3B82C4]/25",
    badgeText: "text-[#16324F] dark:text-[#AED4F8]",
    badgeBorder: "border-transparent"
  },
  {
    id: "emerald",
    labelKey: "account.color_emerald",
    bg: "bg-[#2CA58D]",
    badgeBg: "bg-[#CBEEE8] dark:bg-[#2CA58D]/25",
    badgeText: "text-[#143D35] dark:text-[#9EE8D8]",
    badgeBorder: "border-transparent"
  },
  {
    id: "purple",
    labelKey: "account.color_purple",
    bg: "bg-[#8A63B8]",
    badgeBg: "bg-[#E5DAF3] dark:bg-[#8A63B8]/25",
    badgeText: "text-[#321F47] dark:text-[#D8C2F2]",
    badgeBorder: "border-transparent"
  },
  {
    id: "amber",
    labelKey: "account.color_amber",
    bg: "bg-[#D4973B]",
    badgeBg: "bg-[#F6E6C8] dark:bg-[#D4973B]/25",
    badgeText: "text-[#4A320E] dark:text-[#F5D59E]",
    badgeBorder: "border-transparent"
  },
  {
    id: "rose",
    labelKey: "account.color_rose",
    bg: "bg-[#C86478]",
    badgeBg: "bg-[#F5D8DF] dark:bg-[#C86478]/25",
    badgeText: "text-[#4A1C26] dark:text-[#F2B6C3]",
    badgeBorder: "border-transparent"
  },
  {
    id: "cyan",
    labelKey: "account.color_cyan",
    bg: "bg-[#3D98B8]",
    badgeBg: "bg-[#CEEAF4] dark:bg-[#3D98B8]/25",
    badgeText: "text-[#153B4A] dark:text-[#A5DEF2]",
    badgeBorder: "border-transparent"
  },
  {
    id: "orange",
    labelKey: "account.color_orange",
    bg: "bg-[#D4764E]",
    badgeBg: "bg-[#F6DDD2] dark:bg-[#D4764E]/25",
    badgeText: "text-[#4A2313] dark:text-[#F5C0A9]",
    badgeBorder: "border-transparent"
  },
  {
    id: "indigo",
    labelKey: "account.color_indigo",
    bg: "bg-[#555DB0]",
    badgeBg: "bg-[#D8DAF2] dark:bg-[#555DB0]/25",
    badgeText: "text-[#1E2246] dark:text-[#C5C8F5]",
    badgeBorder: "border-transparent"
  }
]

export function getChildBadgeClasses(colorId?: string | null): string {
  if (!colorId) {
    return "bg-muted/70 text-foreground border-transparent"
  }
  const found = CHILD_COLORS.find(c => c.id === colorId)
  if (found) {
    return `${found.badgeBg} ${found.badgeText} ${found.badgeBorder}`
  }
  return "bg-muted/70 text-foreground border-transparent"
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

export function getChildAccentColor(colorId?: string | null): string {
  if (!colorId) {
    return "bg-muted-foreground/40"
  }
  const found = CHILD_COLORS.find(c => c.id === colorId)
  if (found) {
    return found.bg
  }
  return "bg-muted-foreground/40"
}

export function getChildColor(colorId?: string | null): ChildColorOption | undefined {
  return CHILD_COLORS.find(c => c.id === colorId)
}

