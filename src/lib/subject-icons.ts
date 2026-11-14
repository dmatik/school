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

export function getSubjectConfig(subjectName?: string | null): SubjectConfig {
  if (!subjectName) return DEFAULT_CONFIG

  // Normalize Hebrew quotes (gershayim, geresh) and standard quotes/whitespace
  const s = subjectName.toLowerCase().replace(/[\u05F3\u05F4'"״׳”″`]/g, "").trim()

  // 1. Math & Geometry -> Blue
  if (/מתמט|חשבון|הנדסה|גאומטר|אלגבר|math/.test(s)) {
    return {
      icon: Calculator,
      badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-transparent",
      solidBadgeClass: "bg-[#3B82C4] text-[#DCEBFB] dark:bg-[#3474B0] dark:text-[#E5F0FC] border-transparent",
      textClass: "text-[#3B82C4] dark:text-[#68A8E8]"
    }
  }

  // 2. English & Foreign Languages -> Purple
  if (/אנגל|english|ערבית|צרפתית|שפה זרה/.test(s)) {
    return {
      icon: Languages,
      badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-transparent",
      solidBadgeClass: "bg-[#8A63B8] text-[#EBE2F7] dark:bg-[#7A56A6] dark:text-[#F0E9F9] border-transparent",
      textClass: "text-[#8A63B8] dark:text-[#B794E0]"
    }
  }

  // 3. Science & Technology -> Emerald
  if (/מדע|טבע|טכנול|פיזיק|כימי|ביולוג|אקולוג|science/.test(s)) {
    return {
      icon: FlaskConical,
      badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-transparent",
      solidBadgeClass: "bg-[#2CA58D] text-[#D4F2EC] dark:bg-[#25917B] dark:text-[#DFF6F1] border-transparent",
      textClass: "text-[#2CA58D] dark:text-[#5CD1B8]"
    }
  }

  // 4. Bible -> Brown
  if (/תנך|תורה|תושבע|משנה|גמרא/.test(s)) {
    return {
      icon: Scroll,
      badgeClass: "bg-[#8B5E3C]/15 text-[#6F482A] dark:bg-[#8B5E3C]/25 dark:text-[#D9B391] border-transparent",
      solidBadgeClass: "bg-[#8B5E3C] text-[#F5EBE1] dark:bg-[#7A5234] dark:text-[#F8F1EA] border-transparent",
      textClass: "text-[#8B5E3C] dark:text-[#C89B74]"
    }
  }

  // 4b. Heritage & Culture -> Dark Grey
  if (/מורשת|יהדות|תרבות/.test(s)) {
    return darkGreySubject(Scroll)
  }

  // 5. Art & Crafts -> Dark Grey
  if (/אומנ|אמנ|ציור|פיסול|יצירה|art/.test(s)) {
    return darkGreySubject(Palette)
  }

  // 6. Physical Education & Sports -> Amber/Yellow
  if (/חנג|ספורט|כושר|חינוך גופני|pe|sport/.test(s)) {
    return {
      icon: Dumbbell,
      badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-transparent",
      solidBadgeClass: "bg-[#D4973B] text-[#F9EED8] dark:bg-[#BE8532] dark:text-[#FBF3E2] border-transparent",
      textClass: "text-[#D4973B] dark:text-[#E8B45A]"
    }
  }

  // 7. History & Civics -> Cyan
  if (/היסטור|אזרחות|שלח|history/.test(s)) {
    return {
      icon: Landmark,
      badgeClass: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-transparent",
      solidBadgeClass: "bg-[#3D98B8] text-[#D8EFF7] dark:bg-[#3486A3] dark:text-[#E2F3F9] border-transparent",
      textClass: "text-[#3D98B8] dark:text-[#67BFE0]"
    }
  }

  // 8. Geography & Homeland -> Dark Grey
  if (/גאוגר|גיאוגר|מולדת|ארץ ישראל|geography/.test(s)) {
    return darkGreySubject(Compass)
  }

  // 9. Music -> Dark Grey
  if (/מוזיק|מוסיק|שירה|נגינה|מקהלה|music/.test(s)) {
    return darkGreySubject(Music)
  }

  // 10. Computers & Coding -> Dark Grey
  if (/מחשב|סייבר|רובוט|קוד|תוכנה|תכנות|coding|computer/.test(s)) {
    return darkGreySubject(Laptop)
  }

  // 11. Games & Theater & Drama -> Dark Grey
  if (/משחק|דרמה|תאטרון|תיאטרון/.test(s)) {
    return darkGreySubject(Gamepad2)
  }

  // 12. Life Skills & Homeroom -> Dark Grey
  if (/כישורי חיים|חינוך|מעגל שיח/.test(s)) {
    return darkGreySubject(HeartHandshake)
  }

  // 13. Individual Coaching & Enrichment -> Dark Grey
  if (/פרטני|זמן פלוס|העשרה|מצוינות|אמירים/.test(s)) {
    return darkGreySubject(Sparkles)
  }

  // 14. Hebrew, Language & Literature -> Red
  if (/עברית|לשון|ספרות|הבעה|כתיבה|קריאה|שפה/.test(s)) {
    return {
      icon: BookOpen,
      badgeClass: "bg-red-500/15 text-red-700 dark:text-red-300 border-transparent",
      solidBadgeClass: "bg-[#C84B4B] text-[#FBE4E4] dark:bg-[#B23E3E] dark:text-[#FCECEC] border-transparent",
      textClass: "text-[#C84B4B] dark:text-[#E57373]"
    }
  }

  return DEFAULT_CONFIG
}

export function getSubjectIcon(subjectName?: string | null): LucideIcon {
  return getSubjectConfig(subjectName).icon
}
