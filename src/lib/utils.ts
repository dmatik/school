import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

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

export function parseLocalDate(dateInput: string | Date): Date {
  if (dateInput instanceof Date) return dateInput
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
