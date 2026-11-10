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
}

export const SUBJECT_BADGE_CLASS =
  "bg-zinc-500/10 text-zinc-600 border-transparent dark:bg-zinc-400/10 dark:text-zinc-400"

export const SUBJECT_SOLID_BADGE_CLASS =
  "bg-[#6E768A] text-white/95 border-transparent dark:bg-[#5B6375] dark:text-white/95"

const DEFAULT_CONFIG: SubjectConfig = {
  icon: BookOpen,
  badgeClass: SUBJECT_BADGE_CLASS,
  solidBadgeClass: SUBJECT_SOLID_BADGE_CLASS
}

export function getSubjectConfig(subjectName?: string | null): SubjectConfig {
  if (!subjectName) return DEFAULT_CONFIG

  // Normalize Hebrew quotes (gershayim, geresh) and standard quotes/whitespace
  const s = subjectName.toLowerCase().replace(/[\u05F3\u05F4'"״׳”″`]/g, "").trim()

  // 1. Math -> Blue
  if (/מתמט|חשבון|הנדסה|גאומטר|אלגבר|math/.test(s)) {
    return {
      icon: Calculator,
      badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-transparent",
      solidBadgeClass: "bg-[#3B82C4] text-[#DCEBFB] dark:bg-[#3474B0] dark:text-[#E5F0FC] border-transparent"
    }
  }

  // 2. English & Foreign Languages -> Purple
  if (/אנגל|english|ערבית|צרפתית|שפה זרה/.test(s)) {
    return {
      icon: Languages,
      badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-transparent",
      solidBadgeClass: "bg-[#8A63B8] text-[#EBE2F7] dark:bg-[#7A56A6] dark:text-[#F0E9F9] border-transparent"
    }
  }

  // 3. Science & Technology -> Emerald
  if (/מדע|טבע|טכנול|פיזיק|כימי|ביולוג|אקולוג|science/.test(s)) {
    return {
      icon: FlaskConical,
      badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-transparent",
      solidBadgeClass: "bg-[#2CA58D] text-[#D4F2EC] dark:bg-[#25917B] dark:text-[#DFF6F1] border-transparent"
    }
  }

  // 4. Bible, Heritage, Jewish Culture -> Amber
  if (/תנך|תורה|מורשת|יהדות|תרבות|תושבע|משנה|גמרא/.test(s)) {
    return {
      icon: Scroll,
      badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-transparent",
      solidBadgeClass: "bg-[#D4973B] text-[#F9EED8] dark:bg-[#BE8532] dark:text-[#FBF3E2] border-transparent"
    }
  }

  // 5. Art & Crafts -> Rose
  if (/אומנ|אמנ|ציור|פיסול|יצירה|art/.test(s)) {
    return {
      icon: Palette,
      badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-transparent",
      solidBadgeClass: "bg-[#C86478] text-[#F8E2E7] dark:bg-[#B4576A] dark:text-[#FAE9ED] border-transparent"
    }
  }

  // 6. Physical Education & Sports -> Orange
  if (/חנג|ספורט|כושר|חינוך גופני|pe|sport/.test(s)) {
    return {
      icon: Dumbbell,
      badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-transparent",
      solidBadgeClass: "bg-[#D4764E] text-[#F9E6DE] dark:bg-[#BF6843] dark:text-[#FBEDE7] border-transparent"
    }
  }

  // 7. History & Civics -> Cyan
  if (/היסטור|אזרחות|שלח|history/.test(s)) {
    return {
      icon: Landmark,
      badgeClass: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-transparent",
      solidBadgeClass: "bg-[#3D98B8] text-[#D8EFF7] dark:bg-[#3486A3] dark:text-[#E2F3F9] border-transparent"
    }
  }

  // 8. Geography & Homeland -> Teal
  if (/גאוגר|גיאוגר|מולדת|ארץ ישראל|geography/.test(s)) {
    return {
      icon: Compass,
      badgeClass: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-transparent",
      solidBadgeClass: "bg-[#2A9D8F] text-[#D5F2EE] dark:bg-[#23897D] dark:text-[#E0F5F2] border-transparent"
    }
  }

  // 9. Music -> Fuchsia
  if (/מוזיק|מוסיק|שירה|נגינה|מקהלה|music/.test(s)) {
    return {
      icon: Music,
      badgeClass: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-transparent",
      solidBadgeClass: "bg-[#B55BA6] text-[#F4E0F1] dark:bg-[#A14F93] dark:text-[#F7E8F5] border-transparent"
    }
  }

  // 10. Computers & Coding -> Sky
  if (/מחשב|סייבר|רובוט|קוד|תוכנה|תכנות|coding|computer/.test(s)) {
    return {
      icon: Laptop,
      badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-transparent",
      solidBadgeClass: "bg-[#3A8FC7] text-[#DAEBF8] dark:bg-[#327EB0] dark:text-[#E4F0FA] border-transparent"
    }
  }

  // 11. Games & Theater & Drama -> Violet
  if (/משחק|דרמה|תאטרון|תיאטרון/.test(s)) {
    return {
      icon: Gamepad2,
      badgeClass: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-transparent",
      solidBadgeClass: "bg-[#7562B8] text-[#E6E1F7] dark:bg-[#6654A4] dark:text-[#ECE8F9] border-transparent"
    }
  }

  // 12. Life Skills & Homeroom -> Pink
  if (/כישורי חיים|חינוך|מעגל שיח/.test(s)) {
    return {
      icon: HeartHandshake,
      badgeClass: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-transparent",
      solidBadgeClass: "bg-[#C96590] text-[#F8E2EC] dark:bg-[#B45880] dark:text-[#FAE9F1] border-transparent"
    }
  }

  // 13. Individual Coaching & Enrichment -> Yellow
  if (/פרטני|זמן פלוס|העשרה|מצוינות|אמירים/.test(s)) {
    return {
      icon: Sparkles,
      badgeClass: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-transparent",
      solidBadgeClass: "bg-[#C99E36] text-[#F8EFD6] dark:bg-[#B38C2E] dark:text-[#FAF3E1] border-transparent"
    }
  }

  // 14. Hebrew, Language & Literature -> Indigo
  if (/עברית|לשון|ספרות|הבעה|כתיבה|קריאה|שפה/.test(s)) {
    return {
      icon: BookOpen,
      badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-transparent",
      solidBadgeClass: "bg-[#555DB0] text-[#DCDEF5] dark:bg-[#4B529E] dark:text-[#E5E7F8] border-transparent"
    }
  }

  return DEFAULT_CONFIG
}

export function getSubjectIcon(subjectName?: string | null): LucideIcon {
  return getSubjectConfig(subjectName).icon
}
