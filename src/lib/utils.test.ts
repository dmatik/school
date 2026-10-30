import { describe, it, expect } from 'vitest'
import { cn, formatGradeHebrew, formatSystemDateTime, formatSystemDate, parseLocalDate, getHomeworkText, consolidateHomework } from './utils'

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

describe('consolidateHomework utility', () => {
    it('consolidates double period lessons for same student, date, subject and identical homework text', () => {
        const items = [
            {
                id: 'hw-1',
                studentName: 'דניאל',
                dueDate: '2026-10-30',
                subject: 'מתמטיקה',
                hourNum: 2,
                completed: false,
                description: 'עמוד 45 שאלות 1-10',
                rawData: JSON.stringify({ homeWork: 'עמוד 45 שאלות 1-10' })
            },
            {
                id: 'hw-2',
                studentName: 'דניאל',
                dueDate: '2026-10-30',
                subject: 'מתמטיקה',
                hourNum: 4,
                completed: false,
                description: 'עמוד 45 שאלות 1-10',
                rawData: JSON.stringify({ homeWork: 'עמוד 45 שאלות 1-10' })
            }
        ]

        const consolidated = consolidateHomework(items)
        expect(consolidated).toHaveLength(1)
        expect(consolidated[0].hourNums).toEqual([2, 4])
        expect(consolidated[0].subject).toBe('מתמטיקה')
        expect(consolidated[0].description).toBe('עמוד 45 שאלות 1-10')
    })

    it('sorts hour numbers ascending even if entered in reverse order', () => {
        const items = [
            {
                id: 'hw-1',
                studentName: 'דניאל',
                dueDate: '2026-10-30',
                subject: 'אנגלית',
                hourNum: 5,
                completed: false,
                description: 'Read pages 12-14',
                rawData: JSON.stringify({ homeWork: 'Read pages 12-14' })
            },
            {
                id: 'hw-2',
                studentName: 'דניאל',
                dueDate: '2026-10-30',
                subject: 'אנגלית',
                hourNum: 1,
                completed: false,
                description: 'Read pages 12-14',
                rawData: JSON.stringify({ homeWork: 'Read pages 12-14' })
            }
        ]

        const consolidated = consolidateHomework(items)
        expect(consolidated).toHaveLength(1)
        expect(consolidated[0].hourNums).toEqual([1, 5])
    })

    it('does not consolidate if homework text differs', () => {
        const items = [
            {
                id: 'hw-1',
                studentName: 'דניאל',
                dueDate: '2026-10-30',
                subject: 'מתמטיקה',
                hourNum: 2,
                completed: false,
                description: 'תרגילים 1-5',
                rawData: JSON.stringify({ homeWork: 'תרגילים 1-5' })
            },
            {
                id: 'hw-2',
                studentName: 'דניאל',
                dueDate: '2026-10-30',
                subject: 'מתמטיקה',
                hourNum: 4,
                completed: false,
                description: 'תרגילים 6-10',
                rawData: JSON.stringify({ homeWork: 'תרגילים 6-10' })
            }
        ]

        const consolidated = consolidateHomework(items)
        expect(consolidated).toHaveLength(2)
        expect(consolidated[0].hourNums).toEqual([2])
        expect(consolidated[1].hourNums).toEqual([4])
    })

    it('does not consolidate if subjects differ', () => {
        const items = [
            {
                id: 'hw-1',
                studentName: 'דניאל',
                dueDate: '2026-10-30',
                subject: 'מתמטיקה',
                hourNum: 2,
                completed: false,
                description: 'לקרוא פרק 3',
                rawData: JSON.stringify({ homeWork: 'לקרוא פרק 3' })
            },
            {
                id: 'hw-2',
                studentName: 'דניאל',
                dueDate: '2026-10-30',
                subject: 'היסטוריה',
                hourNum: 4,
                completed: false,
                description: 'לקרוא פרק 3',
                rawData: JSON.stringify({ homeWork: 'לקרוא פרק 3' })
            }
        ]

        const consolidated = consolidateHomework(items)
        expect(consolidated).toHaveLength(2)
    })

    it('does not consolidate if students differ', () => {
        const items = [
            {
                id: 'hw-1',
                studentName: 'דניאל',
                dueDate: '2026-10-30',
                subject: 'מתמטיקה',
                hourNum: 2,
                completed: false,
                description: 'עמוד 20',
                rawData: JSON.stringify({ homeWork: 'עמוד 20' })
            },
            {
                id: 'hw-2',
                studentName: 'מיכל',
                dueDate: '2026-10-30',
                subject: 'מתמטיקה',
                hourNum: 2,
                completed: false,
                description: 'עמוד 20',
                rawData: JSON.stringify({ homeWork: 'עמוד 20' })
            }
        ]

        const consolidated = consolidateHomework(items)
        expect(consolidated).toHaveLength(2)
    })

    it('does not consolidate if dates differ', () => {
        const items = [
            {
                id: 'hw-1',
                studentName: 'דניאל',
                dueDate: '2026-10-30',
                subject: 'מתמטיקה',
                hourNum: 2,
                completed: false,
                description: 'עמוד 20',
                rawData: JSON.stringify({ homeWork: 'עמוד 20' })
            },
            {
                id: 'hw-2',
                studentName: 'דניאל',
                dueDate: '2026-10-31',
                subject: 'מתמטיקה',
                hourNum: 2,
                completed: false,
                description: 'עמוד 20',
                rawData: JSON.stringify({ homeWork: 'עמוד 20' })
            }
        ]

        const consolidated = consolidateHomework(items)
        expect(consolidated).toHaveLength(2)
    })

    it('deduplicates identical hourNum if same slot is duplicated in sync', () => {
        const items = [
            {
                id: 'hw-1',
                studentName: 'דניאל',
                dueDate: '2026-10-30',
                subject: 'מתמטיקה',
                hourNum: 3,
                completed: false,
                description: 'עמוד 20',
                rawData: JSON.stringify({ homeWork: 'עמוד 20' })
            },
            {
                id: 'hw-1-dup',
                studentName: 'דניאל',
                dueDate: '2026-10-30',
                subject: 'מתמטיקה',
                hourNum: 3,
                completed: false,
                description: 'עמוד 20',
                rawData: JSON.stringify({ homeWork: 'עמוד 20' })
            }
        ]

        const consolidated = consolidateHomework(items)
        expect(consolidated).toHaveLength(1)
        expect(consolidated[0].hourNums).toEqual([3])
    })

    it('gracefully handles missing or null hour numbers and preserves teacher info', () => {
        const items = [
            {
                id: 'hw-1',
                studentName: 'דניאל',
                dueDate: '2026-10-30',
                subject: 'מדעים',
                hourNum: null,
                teacher: '',
                completed: false,
                description: 'ניסוי ביתי',
                rawData: JSON.stringify({ homeWork: 'ניסוי ביתי' })
            },
            {
                id: 'hw-2',
                studentName: 'דניאל',
                dueDate: '2026-10-30',
                subject: 'מדעים',
                hourNum: 3,
                teacher: 'המורה שרה',
                completed: false,
                description: 'ניסוי ביתי',
                rawData: JSON.stringify({ homeWork: 'ניסוי ביתי' })
            }
        ]

        const consolidated = consolidateHomework(items)
        expect(consolidated).toHaveLength(1)
        expect(consolidated[0].hourNums).toEqual([3])
        expect(consolidated[0].teacher).toBe('המורה שרה')
    })

    it('does not coerce empty string or whitespace hourNum to 0', () => {
        const items = [
            {
                id: 'hw-1',
                studentName: 'דניאל',
                dueDate: '2026-10-30',
                subject: 'מדעים',
                hourNum: '' as unknown as number,
                completed: false,
                description: 'ניסוי ביתי',
                rawData: JSON.stringify({ homeWork: 'ניסוי ביתי' })
            },
            {
                id: 'hw-2',
                studentName: 'דניאל',
                dueDate: '2026-10-30',
                subject: 'מדעים',
                hourNum: '   ' as unknown as number,
                completed: false,
                description: 'ניסוי ביתי',
                rawData: JSON.stringify({ homeWork: 'ניסוי ביתי' })
            }
        ]

        const consolidated = consolidateHomework(items)
        expect(consolidated).toHaveLength(1)
        expect(consolidated[0].hourNums).toEqual([])
    })

    it('retains all merged database IDs in ids array and combines completed flag', () => {
        const items = [
            {
                id: 'hw-primary',
                studentName: 'דניאל',
                dueDate: '2026-10-30',
                subject: 'אנגלית',
                hourNum: 1,
                completed: true,
                description: 'Workbook p. 12',
                rawData: JSON.stringify({ homeWork: 'Workbook p. 12' })
            },
            {
                id: 'hw-secondary',
                studentName: 'דניאל',
                dueDate: '2026-10-30',
                subject: 'אנגלית',
                hourNum: 3,
                completed: false,
                description: 'Workbook p. 12',
                rawData: JSON.stringify({ homeWork: 'Workbook p. 12' })
            }
        ]

        const consolidated = consolidateHomework(items)
        expect(consolidated).toHaveLength(1)
        expect(consolidated[0].ids).toEqual(['hw-primary', 'hw-secondary'])
        expect(consolidated[0].completed).toBe(false)
    })

    it('handles null, non-array or malformed inputs without throwing', () => {
        expect(consolidateHomework(null as unknown as [])).toEqual([])
        expect(consolidateHomework(undefined as unknown as [])).toEqual([])
        expect(consolidateHomework([null as unknown as { id: string; subject: string; dueDate: string; completed: boolean; description: string }])).toEqual([])
    })
})
