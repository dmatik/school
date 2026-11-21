export type SubjectCategoryKey =
  | "math"
  | "english"
  | "science"
  | "bible"
  | "heritage"
  | "art"
  | "sports"
  | "history"
  | "geography"
  | "music"
  | "computers"
  | "drama"
  | "life_skills"
  | "enrichment"
  | "hebrew"
  | "default"

export interface SubjectColorSpec {
  key: SubjectCategoryKey
  textLight: string
  textDark: string
}

export const DEFAULT_SUBJECT_TEXT_LIGHT = "#525866"
export const DEFAULT_SUBJECT_TEXT_DARK = "#d4d4d8"

function darkGreySpec(key: SubjectCategoryKey): SubjectColorSpec {
  return {
    key,
    textLight: DEFAULT_SUBJECT_TEXT_LIGHT,
    textDark: DEFAULT_SUBJECT_TEXT_DARK
  }
}

export function getSubjectColorSpec(subjectName?: string | null): SubjectColorSpec {
  if (!subjectName) return darkGreySpec("default")

  // Normalize Hebrew quotes (gershayim, geresh) and standard quotes/whitespace
  const s = subjectName.toLowerCase().replace(/[\u05F3\u05F4'"״׳”″`]/g, "").trim()

  // 1. Math & Geometry -> Blue
  if (/מתמט|חשבון|הנדסה|גאומטר|אלגבר|math/.test(s)) {
    return { key: "math", textLight: "#3B82C4", textDark: "#68A8E8" }
  }

  // 2. English & Foreign Languages -> Purple
  if (/אנגל|english|ערבית|צרפתית|שפה זרה/.test(s)) {
    return { key: "english", textLight: "#8A63B8", textDark: "#B794E0" }
  }

  // 3. Science & Technology -> Emerald
  if (/מדע|טבע|טכנול|פיזיק|כימי|ביולוג|אקולוג|science/.test(s)) {
    return { key: "science", textLight: "#2CA58D", textDark: "#5CD1B8" }
  }

  // 4. Bible -> Brown
  if (/תנך|תורה|תושבע|משנה|גמרא/.test(s)) {
    return { key: "bible", textLight: "#8B5E3C", textDark: "#C89B74" }
  }

  // 4b. Heritage & Culture -> Dark Grey
  if (/מורשת|יהדות|תרבות/.test(s)) {
    return darkGreySpec("heritage")
  }

  // 5. Art & Crafts -> Dark Grey
  if (/אומנ|אמנ|ציור|פיסול|יצירה|art/.test(s)) {
    return darkGreySpec("art")
  }

  // 6. Physical Education & Sports -> Amber/Yellow
  if (/חנג|ספורט|כושר|חינוך גופני|pe|sport/.test(s)) {
    return { key: "sports", textLight: "#D4973B", textDark: "#E8B45A" }
  }

  // 7. History & Civics -> Cyan
  if (/היסטור|אזרחות|שלח|history/.test(s)) {
    return { key: "history", textLight: "#3D98B8", textDark: "#67BFE0" }
  }

  // 8. Geography & Homeland -> Dark Grey
  if (/גאוגר|גיאוגר|מולדת|ארץ ישראל|geography/.test(s)) {
    return darkGreySpec("geography")
  }

  // 9. Music -> Dark Grey
  if (/מוזיק|מוסיק|שירה|נגינה|מקהלה|music/.test(s)) {
    return darkGreySpec("music")
  }

  // 10. Computers & Coding -> Dark Grey
  if (/מחשב|סייבר|רובוט|קוד|תוכנה|תכנות|coding|computer/.test(s)) {
    return darkGreySpec("computers")
  }

  // 11. Games & Theater & Drama -> Dark Grey
  if (/משחק|דרמה|תאטרון|תיאטרון/.test(s)) {
    return darkGreySpec("drama")
  }

  // 12. Life Skills & Homeroom -> Dark Grey
  if (/כישורי חיים|חינוך|מעגל שיח/.test(s)) {
    return darkGreySpec("life_skills")
  }

  // 13. Individual Coaching & Enrichment -> Dark Grey
  if (/פרטני|זמן פלוס|העשרה|מצוינות|אמירים/.test(s)) {
    return darkGreySpec("enrichment")
  }

  // 14. Hebrew, Language & Literature -> Red
  if (/עברית|לשון|ספרות|הבעה|כתיבה|קריאה|שפה/.test(s)) {
    return { key: "hebrew", textLight: "#C84B4B", textDark: "#E57373" }
  }

  return darkGreySpec("default")
}
