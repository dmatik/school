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
}

export const SUBJECT_BADGE_CLASS =
  "bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:bg-zinc-400/10 dark:text-zinc-400 dark:border-zinc-400/20"

const DEFAULT_CONFIG: SubjectConfig = {
  icon: BookOpen,
  badgeClass: SUBJECT_BADGE_CLASS
}

export function getSubjectConfig(subjectName?: string | null): SubjectConfig {
  if (!subjectName) return DEFAULT_CONFIG

  // Normalize Hebrew quotes (gershayim, geresh) and standard quotes/whitespace
  const s = subjectName.toLowerCase().replace(/[\u05F3\u05F4'"״׳”″`]/g, "").trim()

  // 1. Math -> Blue
  if (/מתמט|חשבון|הנדסה|גאומטר|אלגבר|math/.test(s)) {
    return {
      icon: Calculator,
      badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 dark:border-blue-500/40"
    }
  }

  // 2. English & Foreign Languages -> Purple
  if (/אנגל|english|ערבית|צרפתית|שפה זרה/.test(s)) {
    return {
      icon: Languages,
      badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 dark:border-purple-500/40"
    }
  }

  // 3. Science & Technology -> Emerald
  if (/מדע|טבע|טכנול|פיזיק|כימי|ביולוג|אקולוג|science/.test(s)) {
    return {
      icon: FlaskConical,
      badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 dark:border-emerald-500/40"
    }
  }

  // 4. Bible, Heritage, Jewish Culture -> Amber
  if (/תנך|תורה|מורשת|יהדות|תרבות|תושבע|משנה|גמרא/.test(s)) {
    return {
      icon: Scroll,
      badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 dark:border-amber-500/40"
    }
  }

  // 5. Art & Crafts -> Rose
  if (/אומנ|אמנ|ציור|פיסול|יצירה|art/.test(s)) {
    return {
      icon: Palette,
      badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 dark:border-rose-500/40"
    }
  }

  // 6. Physical Education & Sports -> Orange
  if (/חנג|ספורט|כושר|חינוך גופני|pe|sport/.test(s)) {
    return {
      icon: Dumbbell,
      badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30 dark:border-orange-500/40"
    }
  }

  // 7. History & Civics -> Cyan
  if (/היסטור|אזרחות|שלח|history/.test(s)) {
    return {
      icon: Landmark,
      badgeClass: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 dark:border-cyan-500/40"
    }
  }

  // 8. Geography & Homeland -> Teal
  if (/גאוגר|גיאוגר|מולדת|ארץ ישראל|geography/.test(s)) {
    return {
      icon: Compass,
      badgeClass: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30 dark:border-teal-500/40"
    }
  }

  // 9. Music -> Fuchsia
  if (/מוזיק|מוסיק|שירה|נגינה|מקהלה|music/.test(s)) {
    return {
      icon: Music,
      badgeClass: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30 dark:border-fuchsia-500/40"
    }
  }

  // 10. Computers & Coding -> Sky
  if (/מחשב|סייבר|רובוט|קוד|תוכנה|תכנות|coding|computer/.test(s)) {
    return {
      icon: Laptop,
      badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 dark:border-sky-500/40"
    }
  }

  // 11. Games & Theater & Drama -> Violet
  if (/משחק|דרמה|תאטרון|תיאטרון/.test(s)) {
    return {
      icon: Gamepad2,
      badgeClass: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30 dark:border-violet-500/40"
    }
  }

  // 12. Life Skills & Homeroom -> Pink
  if (/כישורי חיים|חינוך|מעגל שיח/.test(s)) {
    return {
      icon: HeartHandshake,
      badgeClass: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30 dark:border-pink-500/40"
    }
  }

  // 13. Individual Coaching & Enrichment -> Yellow
  if (/פרטני|זמן פלוס|העשרה|מצוינות|אמירים/.test(s)) {
    return {
      icon: Sparkles,
      badgeClass: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30 dark:border-yellow-500/40"
    }
  }

  // 14. Hebrew, Language & Literature -> Indigo
  if (/עברית|לשון|ספרות|הבעה|כתיבה|קריאה|שפה/.test(s)) {
    return {
      icon: BookOpen,
      badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 dark:border-indigo-500/40"
    }
  }

  return DEFAULT_CONFIG
}

export function getSubjectIcon(subjectName?: string | null): LucideIcon {
  return getSubjectConfig(subjectName).icon
}
