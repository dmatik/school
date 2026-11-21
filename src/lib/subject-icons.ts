import {
  Calculator,
  Languages,
  FlaskConical,
  Scroll,
  Palette,
  Dumbbell,
  BookOpen,
  Landmark,
  Compass,
  Music,
  Laptop,
  Gamepad2,
  HeartHandshake,
  Sparkles,
  type LucideIcon
} from "lucide-react"
import { getSubjectColorSpec, type SubjectCategoryKey } from "./subject-palette"

export interface SubjectConfig {
  icon: LucideIcon
  badgeClass: string
  solidBadgeClass: string
  textClass: string
}

export const SUBJECT_BADGE_CLASS =
  "bg-zinc-500/15 text-zinc-700 border-transparent dark:bg-zinc-400/15 dark:text-zinc-300"

export const SUBJECT_SOLID_BADGE_CLASS =
  "bg-[#525866] text-white/95 border-transparent dark:bg-[#454B57] dark:text-white/95"

export const SUBJECT_TEXT_CLASS =
  "text-[#525866] dark:text-zinc-300"

const DEFAULT_CONFIG: SubjectConfig = {
  icon: BookOpen,
  badgeClass: SUBJECT_BADGE_CLASS,
  solidBadgeClass: SUBJECT_SOLID_BADGE_CLASS,
  textClass: SUBJECT_TEXT_CLASS
}

function darkGreySubject(icon: LucideIcon): SubjectConfig {
  return {
    icon,
    badgeClass: SUBJECT_BADGE_CLASS,
    solidBadgeClass: SUBJECT_SOLID_BADGE_CLASS,
    textClass: SUBJECT_TEXT_CLASS
  }
}

const SUBJECT_CONFIG_BY_KEY: Record<SubjectCategoryKey, SubjectConfig> = {
  math: {
    icon: Calculator,
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-transparent",
    solidBadgeClass: "bg-[#3B82C4] text-[#DCEBFB] dark:bg-[#3474B0] dark:text-[#E5F0FC] border-transparent",
    textClass: "text-[#3B82C4] dark:text-[#68A8E8]"
  },
  english: {
    icon: Languages,
    badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-transparent",
    solidBadgeClass: "bg-[#8A63B8] text-[#EBE2F7] dark:bg-[#7A56A6] dark:text-[#F0E9F9] border-transparent",
    textClass: "text-[#8A63B8] dark:text-[#B794E0]"
  },
  science: {
    icon: FlaskConical,
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-transparent",
    solidBadgeClass: "bg-[#2CA58D] text-[#D4F2EC] dark:bg-[#25917B] dark:text-[#DFF6F1] border-transparent",
    textClass: "text-[#2CA58D] dark:text-[#5CD1B8]"
  },
  bible: {
    icon: Scroll,
    badgeClass: "bg-[#8B5E3C]/15 text-[#6F482A] dark:bg-[#8B5E3C]/25 dark:text-[#D9B391] border-transparent",
    solidBadgeClass: "bg-[#8B5E3C] text-[#F5EBE1] dark:bg-[#7A5234] dark:text-[#F8F1EA] border-transparent",
    textClass: "text-[#8B5E3C] dark:text-[#C89B74]"
  },
  heritage: darkGreySubject(Scroll),
  art: darkGreySubject(Palette),
  sports: {
    icon: Dumbbell,
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-transparent",
    solidBadgeClass: "bg-[#D4973B] text-[#F9EED8] dark:bg-[#BE8532] dark:text-[#FBF3E2] border-transparent",
    textClass: "text-[#D4973B] dark:text-[#E8B45A]"
  },
  history: {
    icon: Landmark,
    badgeClass: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-transparent",
    solidBadgeClass: "bg-[#3D98B8] text-[#D8EFF7] dark:bg-[#3486A3] dark:text-[#E2F3F9] border-transparent",
    textClass: "text-[#3D98B8] dark:text-[#67BFE0]"
  },
  geography: darkGreySubject(Compass),
  music: darkGreySubject(Music),
  computers: darkGreySubject(Laptop),
  drama: darkGreySubject(Gamepad2),
  life_skills: darkGreySubject(HeartHandshake),
  enrichment: darkGreySubject(Sparkles),
  hebrew: {
    icon: BookOpen,
    badgeClass: "bg-red-500/15 text-red-700 dark:text-red-300 border-transparent",
    solidBadgeClass: "bg-[#C84B4B] text-[#FBE4E4] dark:bg-[#B23E3E] dark:text-[#FCECEC] border-transparent",
    textClass: "text-[#C84B4B] dark:text-[#E57373]"
  },
  default: DEFAULT_CONFIG
}

export function getSubjectConfig(subjectName?: string | null): SubjectConfig {
  const { key } = getSubjectColorSpec(subjectName)
  return SUBJECT_CONFIG_BY_KEY[key] ?? DEFAULT_CONFIG
}

export function getSubjectIcon(subjectName?: string | null): LucideIcon {
  return getSubjectConfig(subjectName).icon
}
