import { describe, it, expect } from 'vitest'
import { cn, formatGradeHebrew, formatSystemDateTime, formatSystemDate, parseLocalDate } from './utils'

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
