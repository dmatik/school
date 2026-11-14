import { describe, it, expect } from "vitest"
import { getSubjectConfig, getSubjectIcon } from "@/lib/subject-icons"
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

  it("returns dedicated color accent badge and textClass for core subjects and dark grey for the rest", () => {
    const math = getSubjectConfig("מתמטיקה")
    const geometry = getSubjectConfig("גאומטריה")
    const english = getSubjectConfig("אנגלית")
    const science = getSubjectConfig("מדעים")
    const pe = getSubjectConfig("חנ״ג")
    const bible = getSubjectConfig("תנ״ך")
    const history = getSubjectConfig("היסטוריה")
    const hebrew = getSubjectConfig("עברית")
    const art = getSubjectConfig("אומנות")
    const music = getSubjectConfig("מוזיקה")
    const heritage = getSubjectConfig("בשבילי המורשת")
    const cultureGeo = getSubjectConfig("תרבות / גאוגרפיה")

    expect(math.badgeClass).toContain("blue-500")
    expect(geometry.badgeClass).toContain("blue-500")
    expect(english.badgeClass).toContain("purple-500")
    expect(science.badgeClass).toContain("emerald-500")
    expect(pe.badgeClass).toContain("amber-500")
    expect(bible.badgeClass).toContain("bg-[#8B5E3C]/15")
    expect(history.badgeClass).toContain("cyan-500")
    expect(hebrew.badgeClass).toContain("red-500")

    expect(math.solidBadgeClass).toContain("bg-[#3B82C4]")
    expect(english.solidBadgeClass).toContain("bg-[#8A63B8]")
    expect(science.solidBadgeClass).toContain("bg-[#2CA58D]")
    expect(pe.solidBadgeClass).toContain("bg-[#D4973B]")
    expect(bible.solidBadgeClass).toContain("bg-[#8B5E3C]")
    expect(history.solidBadgeClass).toContain("bg-[#3D98B8]")
    expect(hebrew.solidBadgeClass).toContain("bg-[#C84B4B]")

    expect(math.textClass).toContain("text-[#3B82C4]")
    expect(hebrew.textClass).toContain("text-[#C84B4B]")

    // Remaining subjects keep their icons but use dark grey color palette
    expect(art.icon).toBe(Palette)
    expect(art.badgeClass).toContain("zinc-500")
    expect(art.solidBadgeClass).toContain("bg-[#525866]")
    expect(art.textClass).toContain("text-[#525866]")
    expect(music.badgeClass).toContain("zinc-500")
    expect(music.solidBadgeClass).toContain("bg-[#525866]")
    expect(music.textClass).toContain("text-[#525866]")
    expect(heritage.icon).toBe(Scroll)
    expect(heritage.textClass).toContain("text-[#525866]")
    expect(cultureGeo.textClass).toContain("text-[#525866]")
  })
})

