import { describe, it, expect } from "vitest"
import { getSubjectConfig, getSubjectIcon, SUBJECT_BADGE_CLASS } from "@/lib/subject-icons"
import {
  Calculator,
  Languages,
  FlaskConical,
  Scroll,
  Palette,
  Dumbbell,
  BookOpen,
  Landmark,
  Gamepad2,
  HeartHandshake,
  Sparkles
} from "lucide-react"

describe("Subject Icon Mapping", () => {
  it("maps real-world subjects from Webtop to appropriate icons", () => {
    expect(getSubjectIcon("מתמטיקה")).toBe(Calculator)
    expect(getSubjectIcon("חשבון")).toBe(Calculator)
    expect(getSubjectIcon("אנגלית")).toBe(Languages)
    expect(getSubjectIcon("English")).toBe(Languages)
    expect(getSubjectIcon("מדעים")).toBe(FlaskConical)
    expect(getSubjectIcon("מדע וטכנולוגיה")).toBe(FlaskConical)
    expect(getSubjectIcon("תנך")).toBe(Scroll)
    expect(getSubjectIcon("תנ״ך")).toBe(Scroll)
    expect(getSubjectIcon('תנ"ך')).toBe(Scroll)
    expect(getSubjectIcon("תרבות")).toBe(Scroll)
    expect(getSubjectIcon("בשבילי המורשת")).toBe(Scroll)
    expect(getSubjectIcon("אומנות")).toBe(Palette)
    expect(getSubjectIcon("אמנות")).toBe(Palette)
    expect(getSubjectIcon("עברית")).toBe(BookOpen)
    expect(getSubjectIcon("לשון והבעה")).toBe(BookOpen)
    expect(getSubjectIcon('חנ``ג')).toBe(Dumbbell)
    expect(getSubjectIcon('חנ"ג')).toBe(Dumbbell)
    expect(getSubjectIcon("חינוך גופני")).toBe(Dumbbell)
    expect(getSubjectIcon("ספורט")).toBe(Dumbbell)
    expect(getSubjectIcon("היסטוריה")).toBe(Landmark)
    expect(getSubjectIcon("אזרחות")).toBe(Landmark)
    expect(getSubjectIcon("כישורי חיים")).toBe(HeartHandshake)
    expect(getSubjectIcon("שיעור חינוך")).toBe(HeartHandshake)
    expect(getSubjectIcon("פרטני")).toBe(Sparkles)
    expect(getSubjectIcon("זמן פלוס")).toBe(Sparkles)
    expect(getSubjectIcon("משחק")).toBe(Gamepad2)
  })

  it("falls back to BookOpen for unknown or empty subjects", () => {
    expect(getSubjectIcon("")).toBe(BookOpen)
    expect(getSubjectIcon(null)).toBe(BookOpen)
    expect(getSubjectIcon(undefined)).toBe(BookOpen)
    expect(getSubjectIcon("נושא לא מוכר כללי")).toBe(BookOpen)
  })

  it("returns the unified light grey color accent badge for all subjects", () => {
    const math = getSubjectConfig("מתמטיקה")
    const english = getSubjectConfig("אנגלית")
    const science = getSubjectConfig("מדעים")

    expect(math.badgeClass).toBe(SUBJECT_BADGE_CLASS)
    expect(english.badgeClass).toBe(SUBJECT_BADGE_CLASS)
    expect(science.badgeClass).toBe(SUBJECT_BADGE_CLASS)
    expect(math.badgeClass).toContain("zinc-500")
  })
})

