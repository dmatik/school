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

export function getSubjectIcon(subjectName?: string | null): LucideIcon {
  if (!subjectName) return DEFAULT_CONFIG.icon

  // Normalize Hebrew quotes (gershayim, geresh) and standard quotes/whitespace
  const s = subjectName.toLowerCase().replace(/[\u05F3\u05F4'"״׳”″`]/g, "").trim()

  // 1. Math
  if (/מתמט|חשבון|הנדסה|גאומטר|אלגבר|math/.test(s)) return Calculator

  // 2. English & Foreign Languages
  if (/אנגל|english|ערבית|צרפתית|שפה זרה/.test(s)) return Languages

  // 3. Science & Technology
  if (/מדע|טבע|טכנול|פיזיק|כימי|ביולוג|אקולוג|science/.test(s)) return FlaskConical

  // 4. Bible, Heritage, Jewish Culture
  if (/תנך|תורה|מורשת|יהדות|תרבות|תושבע|משנה|גמרא/.test(s)) return Scroll

  // 5. Art & Crafts
  if (/אומנ|אמנ|ציור|פיסול|יצירה|art/.test(s)) return Palette

  // 6. Physical Education & Sports
  if (/חנג|ספורט|כושר|חינוך גופני|pe|sport/.test(s)) return Dumbbell

  // 7. History & Civics
  if (/היסטור|אזרחות|שלח|history/.test(s)) return Landmark

  // 8. Geography & Homeland
  if (/גאוגר|גיאוגר|מולדת|ארץ ישראל|geography/.test(s)) return Compass

  // 9. Music
  if (/מוזיק|מוסיק|שירה|נגינה|מקהלה|music/.test(s)) return Music

  // 10. Computers & Coding
  if (/מחשב|סייבר|רובוט|קוד|תוכנה|תכנות|coding|computer/.test(s)) return Laptop

  // 11. Games & Theater & Drama
  if (/משחק|דרמה|תאטרון|תיאטרון/.test(s)) return Gamepad2

  // 12. Life Skills & Homeroom
  if (/כישורי חיים|חינוך|מעגל שיח/.test(s)) return HeartHandshake

  // 13. Individual Coaching & Enrichment
  if (/פרטני|זמן פלוס|העשרה|מצוינות|אמירים/.test(s)) return Sparkles

  // 14. Hebrew, Language & Literature
  if (/עברית|לשון|ספרות|הבעה|כתיבה|קריאה|שפה/.test(s)) return BookOpen

  return DEFAULT_CONFIG.icon
}

export function getSubjectConfig(subjectName?: string | null): SubjectConfig {
  return {
    icon: getSubjectIcon(subjectName),
    badgeClass: SUBJECT_BADGE_CLASS
  }
}
