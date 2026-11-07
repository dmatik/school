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
  "bg-zinc-500/10 text-zinc-600 border-transparent dark:bg-zinc-400/10 dark:text-zinc-400"

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
      badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-transparent"
    }
  }

  // 2. English & Foreign Languages -> Purple
  if (/אנגל|english|ערבית|צרפתית|שפה זרה/.test(s)) {
    return {
      icon: Languages,
      badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-transparent"
    }
  }

  // 3. Science & Technology -> Emerald
  if (/מדע|טבע|טכנול|פיזיק|כימי|ביולוג|אקולוג|science/.test(s)) {
    return {
      icon: FlaskConical,
      badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-transparent"
    }
  }

  // 4. Bible, Heritage, Jewish Culture -> Amber
  if (/תנך|תורה|מורשת|יהדות|תרבות|תושבע|משנה|גמרא/.test(s)) {
    return {
      icon: Scroll,
      badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-transparent"
    }
  }

  // 5. Art & Crafts -> Rose
  if (/אומנ|אמנ|ציור|פיסול|יצירה|art/.test(s)) {
    return {
      icon: Palette,
      badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-transparent"
    }
  }

  // 6. Physical Education & Sports -> Orange
  if (/חנג|ספורט|כושר|חינוך גופני|pe|sport/.test(s)) {
    return {
      icon: Dumbbell,
      badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-transparent"
    }
  }

  // 7. History & Civics -> Cyan
  if (/היסטור|אזרחות|שלח|history/.test(s)) {
    return {
      icon: Landmark,
      badgeClass: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-transparent"
    }
  }

  // 8. Geography & Homeland -> Teal
  if (/גאוגר|גיאוגר|מולדת|ארץ ישראל|geography/.test(s)) {
    return {
      icon: Compass,
      badgeClass: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-transparent"
    }
  }

  // 9. Music -> Fuchsia
  if (/מוזיק|מוסיק|שירה|נגינה|מקהלה|music/.test(s)) {
    return {
      icon: Music,
      badgeClass: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-transparent"
    }
  }

  // 10. Computers & Coding -> Sky
  if (/מחשב|סייבר|רובוט|קוד|תוכנה|תכנות|coding|computer/.test(s)) {
    return {
      icon: Laptop,
      badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-transparent"
    }
  }

  // 11. Games & Theater & Drama -> Violet
  if (/משחק|דרמה|תאטרון|תיאטרון/.test(s)) {
    return {
      icon: Gamepad2,
      badgeClass: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-transparent"
    }
  }

  // 12. Life Skills & Homeroom -> Pink
  if (/כישורי חיים|חינוך|מעגל שיח/.test(s)) {
    return {
      icon: HeartHandshake,
      badgeClass: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-transparent"
    }
  }

  // 13. Individual Coaching & Enrichment -> Yellow
  if (/פרטני|זמן פלוס|העשרה|מצוינות|אמירים/.test(s)) {
    return {
      icon: Sparkles,
      badgeClass: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-transparent"
    }
  }

  // 14. Hebrew, Language & Literature -> Indigo
  if (/עברית|לשון|ספרות|הבעה|כתיבה|קריאה|שפה/.test(s)) {
    return {
      icon: BookOpen,
      badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-transparent"
    }
  }

  return DEFAULT_CONFIG
}

export function getSubjectIcon(subjectName?: string | null): LucideIcon {
  return getSubjectConfig(subjectName).icon
}
