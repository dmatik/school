import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import type { HomeworkItem, ConsolidatedHomeworkItem } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function uuidv4() {
  // Use native crypto.randomUUID if available (Secure Contexts)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for Insecure Contexts (e.g. HTTP on LAN)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function parseLocalDate(dateInput: string | Date | null | undefined): Date {
  if (!dateInput) return new Date()
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? new Date() : dateInput
  if (typeof dateInput !== "string") return new Date()
  const clean = dateInput.split("T")[0]
  const parts = clean.split("-").map(Number)
  if (parts.length === 3 && !parts.some(isNaN)) {
    return new Date(parts[0], parts[1] - 1, parts[2])
  }
  const parsed = new Date(dateInput)
  return isNaN(parsed.getTime()) ? new Date() : parsed
}

const HEBREW_GRADE_MAP: Record<number, string> = {
  1: "א",
  2: "ב",
  3: "ג",
  4: "ד",
  5: "ה",
  6: "ו",
  7: "ז",
  8: "ח",
  9: "ט",
  10: "י",
  11: "יא",
  12: "יב"
}

export function formatGradeHebrew(code: number | string | null | undefined): string {
  if (code == null) return ""
  const num = typeof code === "number" ? code : parseInt(String(code), 10)
  if (!isNaN(num) && HEBREW_GRADE_MAP[num]) {
    return HEBREW_GRADE_MAP[num]
  }
  return String(code)
}

export function formatSystemDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "-"
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput
    if (isNaN(d.getTime())) return "-"
    return format(d, "dd/MM/yyyy, HH:mm:ss")
  } catch {
    return "-"
  }
}

export function formatSystemDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "-"
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput
    if (isNaN(d.getTime())) return "-"
    return format(d, "dd/MM/yyyy")
  } catch {
    return "-"
  }
}

/**
 * Extracts only the actual homework text from a homework item.
 * Never falls back to displaying the lesson topic or what was taught in class.
 */
export function getHomeworkText(hw: {
  description?: string | null
  lessonSubject?: string | null
  rawData?: string | null
}): string {
  if (hw.rawData) {
    try {
      const raw = typeof hw.rawData === "string" ? JSON.parse(hw.rawData) : hw.rawData
      if (raw && typeof raw === "object") {
        // Webtop weekly schedule lesson: item.homeWork
        if ("homeWork" in raw) {
          return raw.homeWork ? String(raw.homeWork).trim() : ""
        }
        // Webtop dashboard homework: item.homeworkData
        if ("homeworkData" in raw) {
          return raw.homeworkData ? String(raw.homeworkData).trim() : ""
        }
      }
    } catch {
      // ignore parse error and proceed to fallback
    }
  }

  // Fallback when rawData is unavailable:
  // If description matches lessonSubject, it was populated with the lesson subject due to lack of homework
  if (hw.lessonSubject && hw.description && hw.description.trim() === hw.lessonSubject.trim()) {
    return ""
  }

  return hw.description ? hw.description.trim() : ""
}

/**
 * Consolidates homework items so that if the same student has the same subject
 * multiple times on the same date with identical homework text, only one card is displayed
 * with all relevant lesson numbers combined.
 */
export function consolidateHomework(items: HomeworkItem[]): ConsolidatedHomeworkItem[] {
  if (!Array.isArray(items)) {
    return []
  }

  const map = new Map<string, ConsolidatedHomeworkItem>()

  for (const item of items) {
    if (!item || typeof item !== "object") {
      continue
    }

    const hwText = getHomeworkText(item).trim()
    if (!hwText) {
      continue
    }

    const studentKey = (item.childId?.trim() || item.studentId?.trim() || item.studentName?.trim() || "").toLowerCase()
    const dateKey = item.dueDate || ""
    const subjectKey = (item.subject || "").trim().toLowerCase().normalize("NFC")
    const textKey = hwText.replace(/\s+/g, " ").normalize("NFC")

    const groupKey = `${studentKey}:::${dateKey}:::${subjectKey}:::${textKey}`
    const existing = map.get(groupKey)

    // Strict validation of hourNum: avoid JS Number("") === 0 coercion or boolean/Infinity coercion
    const val = item.hourNum as unknown
    const rawHour = typeof val === "string" ? val.trim() : val
    const hourNum = (
      rawHour !== "" &&
      rawHour !== null &&
      typeof rawHour !== "boolean" &&
      rawHour !== undefined &&
      Number.isInteger(Number(rawHour)) &&
      Number(rawHour) >= 0 &&
      Number(rawHour) <= 24
    ) ? Number(rawHour) : null

    if (!existing) {
      map.set(groupKey, {
        ...item,
        ids: item.id ? [item.id] : [],
        hourNums: hourNum !== null ? [hourNum] : []
      })
    } else {
      if (item.id && !existing.ids.includes(item.id)) {
        existing.ids.push(item.id)
      }
      existing.completed = Boolean(existing.completed && item.completed)

      if (hourNum !== null && !existing.hourNums.includes(hourNum)) {
        existing.hourNums.push(hourNum)
        existing.hourNums.sort((a, b) => a - b)
        existing.hourNum = existing.hourNums[0]
      }
      if (!existing.teacher && item.teacher) {
        existing.teacher = item.teacher
      }
      if (!existing.childId && item.childId) {
        existing.childId = item.childId
      }
    }
  }

  return Array.from(map.values())
}

