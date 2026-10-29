import { describe, it, expect } from 'vitest'
import { cn, formatGradeHebrew, formatSystemDateTime, formatSystemDate, parseLocalDate, getHomeworkText } from './utils'

describe('cn utility', () => {
    it('merges tailwind classes correctly', () => {
        const result = cn('px-2 py-1', 'bg-red-500')
        expect(result).toBe('px-2 py-1 bg-red-500')
    })

    it('handles conditional classes', () => {
        const isTrue = true
        const isFalse = false
        const result = cn('px-2', isTrue && 'py-1', isFalse && 'bg-red-500')
        expect(result).toBe('px-2 py-1')
    })

    it('merges conflicting tailwind classes (uses tailwind-merge)', () => {
        const result = cn('px-2 p-4')
        expect(result).toBe('p-4')
    })
})

describe('formatGradeHebrew utility', () => {
    it('converts grade numbers 1-12 to their corresponding Hebrew letters', () => {
        expect(formatGradeHebrew(1)).toBe('א')
        expect(formatGradeHebrew(2)).toBe('ב')
        expect(formatGradeHebrew(3)).toBe('ג')
        expect(formatGradeHebrew(4)).toBe('ד')
        expect(formatGradeHebrew(5)).toBe('ה')
        expect(formatGradeHebrew(6)).toBe('ו')
        expect(formatGradeHebrew(7)).toBe('ז')
        expect(formatGradeHebrew(8)).toBe('ח')
        expect(formatGradeHebrew(9)).toBe('ט')
        expect(formatGradeHebrew(10)).toBe('י')
        expect(formatGradeHebrew(11)).toBe('יא')
        expect(formatGradeHebrew(12)).toBe('יב')
    })

    it('handles numeric string representations', () => {
        expect(formatGradeHebrew('4')).toBe('ד')
        expect(formatGradeHebrew('6')).toBe('ו')
    })

    it('falls back gracefully on non-numeric or already Hebrew inputs', () => {
        expect(formatGradeHebrew('ד')).toBe('ד')
        expect(formatGradeHebrew(null)).toBe('')
        expect(formatGradeHebrew(undefined)).toBe('')
    })
})

describe('formatSystemDateTime and formatSystemDate utilities', () => {
    it('formats a date and time string using DD/MM/YYYY and 24-hour time', () => {
        const d = new Date(2026, 9, 28, 17, 29, 7) // Oct 28, 2026, 17:29:07
        const result = formatSystemDateTime(d)
        expect(result).toBe('28/10/2026, 17:29:07')

        const dateOnly = formatSystemDate(d)
        expect(dateOnly).toBe('28/10/2026')
    })

    it('returns "-" for null, undefined, or invalid dates', () => {
        expect(formatSystemDateTime(null)).toBe('-')
        expect(formatSystemDateTime(undefined)).toBe('-')
        expect(formatSystemDateTime('invalid-date')).toBe('-')
        expect(formatSystemDate(null)).toBe('-')
        expect(formatSystemDate(undefined)).toBe('-')
    })
})

describe('parseLocalDate utility', () => {
    it('parses YYYY-MM-DD strings cleanly into local date objects', () => {
        const d = parseLocalDate('2026-10-28')
        expect(d.getFullYear()).toBe(2026)
        expect(d.getMonth()).toBe(9) // 0-indexed October
        expect(d.getDate()).toBe(28)
    })

    it('handles ISO strings with timestamps', () => {
        const d = parseLocalDate('2026-05-15T12:00:00Z')
        expect(d.getFullYear()).toBe(2026)
        expect(d.getMonth()).toBe(4) // May
        expect(d.getDate()).toBe(15)
    })

    it('gracefully handles null, undefined, or empty values without throwing', () => {
        expect(() => parseLocalDate(null)).not.toThrow()
        expect(() => parseLocalDate(undefined)).not.toThrow()
        expect(() => parseLocalDate('')).not.toThrow()
        expect(parseLocalDate(null)).toBeInstanceOf(Date)
    })
})

describe('getHomeworkText utility', () => {
    it('extracts real homework from weekly lessons rawData (homeWork field)', () => {
        const item = {
            description: 'עמוד 43 עד 47',
            lessonSubject: 'המבנה העשרוני',
            rawData: JSON.stringify({
                descClass: 'המבנה העשרוני',
                homeWork: '  עמוד 43 עד 47  '
            })
        }
        expect(getHomeworkText(item)).toBe('עמוד 43 עד 47')
    })

    it('returns empty string when weekly lesson rawData has empty homeWork even if descClass exists', () => {
        const item = {
            description: 'המבנה העשרוני ופעולות החשבון',
            lessonSubject: 'המבנה העשרוני ופעולות החשבון',
            rawData: JSON.stringify({
                descClass: 'המבנה העשרוני ופעולות החשבון',
                homeWork: ''
            })
        }
        expect(getHomeworkText(item)).toBe('')
    })

    it('returns empty string when weekly lesson rawData has null homeWork', () => {
        const item = {
            description: 'שיעור ספורט',
            lessonSubject: 'שיעור ספורט',
            rawData: JSON.stringify({
                descClass: 'שיעור ספורט',
                homeWork: null
            })
        }
        expect(getHomeworkText(item)).toBe('')
    })

    it('extracts homework from dashboard rawData (homeworkData field)', () => {
        const item = {
            description: 'לסיים עבודה במחברת',
            lessonSubject: 'Answer Questions About Texts',
            rawData: JSON.stringify({
                lessonSubject: 'Answer Questions About Texts',
                homeworkData: 'לסיים עבודה במחברת'
            })
        }
        expect(getHomeworkText(item)).toBe('לסיים עבודה במחברת')
    })

    it('returns empty string when dashboard rawData has empty homeworkData', () => {
        const item = {
            description: 'נושא השיעור',
            lessonSubject: 'נושא השיעור',
            rawData: JSON.stringify({
                lessonSubject: 'נושא השיעור',
                homeworkData: ''
            })
        }
        expect(getHomeworkText(item)).toBe('')
    })

    it('falls back to empty string when rawData is missing but description equals lessonSubject', () => {
        const item = {
            description: 'חזרה על החומר',
            lessonSubject: 'חזרה על החומר',
            rawData: null
        }
        expect(getHomeworkText(item)).toBe('')
    })

    it('returns description when rawData is missing and description differs from lessonSubject', () => {
        const item = {
            description: 'עמוד 20 שאלות 1-5',
            lessonSubject: 'היסטוריה של עם ישראל',
            rawData: null
        }
        expect(getHomeworkText(item)).toBe('עמוד 20 שאלות 1-5')
    })

    it('handles empty, null or undefined objects gracefully', () => {
        expect(getHomeworkText({})).toBe('')
        expect(getHomeworkText({ description: null, lessonSubject: null, rawData: null })).toBe('')
        expect(getHomeworkText({ rawData: 'invalid json', description: 'test', lessonSubject: 'test' })).toBe('')
    })
})
