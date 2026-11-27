import {
  formatGradeHebrew,
  formatSystemDateTime,
  formatShortDate,
  formatDateSectionHeader,
} from '../src/lib/dateUtils';
import { getHomeworkText, consolidateHomework } from '../src/lib/homeworkUtils';
import type { HomeworkItem } from '../../src/types';

describe('dateUtils', () => {
  describe('formatGradeHebrew', () => {
    it('formats all numeric grade codes 1-12 to Hebrew letters', () => {
      const expected = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'יא', 'יב'];
      expected.forEach((letter, idx) => {
        expect(formatGradeHebrew(idx + 1)).toBe(letter);
      });
    });

    it('accepts string grade codes', () => {
      expect(formatGradeHebrew('1')).toBe('א');
      expect(formatGradeHebrew('6')).toBe('ו');
      expect(formatGradeHebrew('11')).toBe('יא');
      expect(formatGradeHebrew('12')).toBe('יב');
    });

    it('returns original string for out-of-range or invalid codes', () => {
      expect(formatGradeHebrew(0)).toBe('0');
      expect(formatGradeHebrew(-1)).toBe('-1');
      expect(formatGradeHebrew(13)).toBe('13');
      expect(formatGradeHebrew('abc')).toBe('abc');
      expect(formatGradeHebrew(NaN)).toBe('NaN');
    });
  });

  describe('formatSystemDateTime & formatShortDate', () => {
    it('formats ISO strings and Date objects cleanly', () => {
      const iso = '2026-04-06T09:15:00';
      expect(formatSystemDateTime(iso)).toBe('06/04/2026 09:15');
      expect(formatShortDate(iso)).toBe('06/04/2026');
      expect(formatShortDate(new Date(2026, 3, 6))).toBe('06/04/2026');
      expect(formatSystemDateTime(new Date(2026, 3, 6, 14, 5))).toBe('06/04/2026 14:05');
    });

    it('returns original input on invalid date', () => {
      expect(formatSystemDateTime('not-a-date')).toBe('not-a-date');
      expect(formatShortDate('invalid')).toBe('invalid');
    });
  });

  describe('formatDateSectionHeader', () => {
    const t = (key: string) => key;

    it('prefixes today, yesterday, and tomorrow labels', () => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const toIso = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);

      expect(formatDateSectionHeader(toIso(now), 'en', t)).toContain('common.today ·');
      expect(formatDateSectionHeader(toIso(yesterday), 'he', t)).toContain('common.yesterday ·');
      expect(formatDateSectionHeader(toIso(tomorrow), 'en', t)).toContain('common.tomorrow ·');
    });

    it('formats older dates in English and Hebrew without relative prefix', () => {
      const en = formatDateSectionHeader('2024-01-15', 'en', t);
      const he = formatDateSectionHeader('2024-01-15', 'he', t);
      expect(en).toContain('15/01/2024');
      expect(en).not.toContain('common.');
      expect(he).toContain('15/01/2024');
      expect(he).not.toContain('common.');
    });

    it('returns original string when dateStr is invalid', () => {
      expect(formatDateSectionHeader('bad-date', 'he', t)).toBe('bad-date');
    });
  });
});

describe('homeworkUtils', () => {
  describe('getHomeworkText', () => {
    it('extracts homeWork from rawData JSON', () => {
      expect(
        getHomeworkText({
          description: 'Lesson topic',
          rawData: JSON.stringify({ homeWork: '  Page 42 ex 1-3  ' }),
        })
      ).toBe('Page 42 ex 1-3');
    });

    it('extracts homeworkData when homeWork is absent', () => {
      expect(
        getHomeworkText({
          rawData: JSON.stringify({ homeworkData: 'Read chapter 4' }),
        })
      ).toBe('Read chapter 4');
    });

    it('returns empty string when rawData explicitly has empty or null homeWork', () => {
      expect(
        getHomeworkText({
          description: 'Classwork topic',
          rawData: JSON.stringify({ homeWork: '' }),
        })
      ).toBe('');
      expect(
        getHomeworkText({
          description: 'Classwork topic',
          rawData: JSON.stringify({ homeWork: null }),
        })
      ).toBe('');
    });

    it('ignores description when it matches lessonSubject (with surrounding whitespace)', () => {
      expect(
        getHomeworkText({
          description: '  Fractions  ',
          lessonSubject: 'Fractions',
        })
      ).toBe('');
    });

    it('falls back to trimmed description when rawData is invalid or missing', () => {
      expect(
        getHomeworkText({
          description: '  Complete worksheet  ',
          rawData: '{invalid json',
        })
      ).toBe('Complete worksheet');
      expect(getHomeworkText({ description: null, rawData: null })).toBe('');
    });
  });

  describe('consolidateHomework', () => {
    const makeItem = (overrides: Partial<HomeworkItem>): HomeworkItem => ({
      id: 'hw-1',
      studentId: 'stu-1',
      studentName: 'Noa',
      childId: 'child-1',
      subject: 'Math',
      teacher: 'Ms. Levi',
      dueDate: '2026-04-06',
      hourNum: 2,
      description: 'Page 12',
      lessonSubject: 'Algebra',
      completed: false,
      rawData: JSON.stringify({ homeWork: 'Page 12' }),
      ...overrides,
    });

    it('returns empty array for non-array or empty inputs', () => {
      expect(consolidateHomework(null as unknown as HomeworkItem[])).toEqual([]);
      expect(consolidateHomework([])).toEqual([]);
    });

    it('skips null/non-object entries safely', () => {
      const result = consolidateHomework([
        null as unknown as HomeworkItem,
        undefined as unknown as HomeworkItem,
        makeItem({ id: 'ok' }),
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ok');
    });

    it('excludes items without actual homework text', () => {
      const result = consolidateHomework([
        makeItem({ id: '1', rawData: JSON.stringify({ homeWork: '' }) }),
        makeItem({ id: '2', description: 'Algebra', lessonSubject: 'Algebra', rawData: undefined }),
      ]);
      expect(result).toHaveLength(0);
    });

    it('merges duplicate subject/date/text items for same student and sorts hourNums', () => {
      const result = consolidateHomework([
        makeItem({ id: 'hw-2', hourNum: 4, teacher: '' }),
        makeItem({ id: 'hw-1', hourNum: 2, teacher: 'Ms. Levi' }),
        makeItem({ id: 'hw-1', hourNum: 2 }), // duplicate id & hourNum
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].ids).toEqual(['hw-2', 'hw-1']);
      expect(result[0].hourNums).toEqual([2, 4]);
      expect(result[0].hourNum).toBe(2);
      expect(result[0].teacher).toBe('Ms. Levi');
    });

    it('normalizes whitespace, casing, and Unicode NFC when grouping', () => {
      const result = consolidateHomework([
        makeItem({
          id: '1',
          childId: 'Child-1',
          subject: '  math ',
          hourNum: 1,
          rawData: JSON.stringify({ homeWork: 'Page   12\n ex 1' }),
        }),
        makeItem({
          id: '2',
          childId: 'child-1',
          subject: 'MATH',
          hourNum: 3,
          rawData: JSON.stringify({ homeWork: 'Page 12 ex 1' }),
        }),
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].hourNums).toEqual([1, 3]);
    });

    it('ignores invalid or out-of-range hourNum values', () => {
      const result = consolidateHomework([
        makeItem({ id: '1', hourNum: '' as unknown as number }),
        makeItem({ id: '2', hourNum: 25 }),
        makeItem({ id: '3', hourNum: -1 }),
        makeItem({ id: '4', hourNum: 1.5 }),
        makeItem({ id: '5', hourNum: true as unknown as number }),
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].hourNums).toEqual([]);
    });

    it('falls back from childId to studentId to studentName for student grouping', () => {
      const result = consolidateHomework([
        makeItem({ id: '1', childId: '', studentId: 'S1', studentName: 'Noa', hourNum: 1 }),
        makeItem({ id: '2', childId: '', studentId: 's1', studentName: 'Noa', hourNum: 2 }),
        makeItem({ id: '3', childId: '', studentId: '', studentName: 'Dana', hourNum: 1 }),
      ]);
      expect(result).toHaveLength(2);
    });

    it('keeps items separate across different students, dates, subjects, or text', () => {
      const result = consolidateHomework([
        makeItem({ id: '1', childId: 'c1', subject: 'Math', dueDate: '2026-04-06' }),
        makeItem({ id: '2', childId: 'c2', subject: 'Math', dueDate: '2026-04-06' }),
        makeItem({ id: '3', childId: 'c1', subject: 'English', dueDate: '2026-04-06' }),
        makeItem({ id: '4', childId: 'c1', subject: 'Math', dueDate: '2026-04-07' }),
        makeItem({
          id: '5',
          childId: 'c1',
          subject: 'Math',
          dueDate: '2026-04-06',
          rawData: JSON.stringify({ homeWork: 'Page 15' }),
        }),
      ]);
      expect(result).toHaveLength(5);
    });
  });
});
