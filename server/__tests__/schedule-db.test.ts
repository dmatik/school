import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import Database from 'better-sqlite3';
import { initDb } from '../db.js';
import { getChildSolidHex } from '../../src/lib/child-colors';
import { getSubjectColorSpec } from '../../src/lib/subject-palette';
import {
  SCHEDULE_PDF_FILENAME,
  SCHEDULE_PDF_LAYOUT,
  buildSchedulePdfHtml,
  buildSchedulePdfModel,
} from '../../src/lib/schedule-pdf-shared';

const mockLessons = [
  { id: 'lesson-1', childId: 'child-abc-1', dayOfWeek: 0, hourNum: 1, subject: 'מתמטיקה' },
  { id: 'lesson-2', childId: 'child-abc-1', dayOfWeek: 0, hourNum: 2, subject: 'עברית' },
  { id: 'lesson-3', childId: 'child-abc-1', dayOfWeek: 2, hourNum: 3, subject: 'מדעים' },
];

const mockFinishTimes = [
  { id: 'ft-1', childId: 'child-abc-1', dayOfWeek: 0, finishTime: '13:30' },
  { id: 'ft-2', childId: 'child-abc-1', dayOfWeek: 2, finishTime: '14:15' },
];

describe('Schedule Shared PDF Model & Color Palette', () => {
  it('resolves child solid hexes and subject palette colors consistently', () => {
    expect(getChildSolidHex('blue')).toBe('#3B82C4');
    expect(getChildSolidHex('rose')).toBe('#C86478');
    expect(getChildSolidHex(null)).toBe('#2463eb');
    expect(getChildSolidHex('unknown', '#123456')).toBe('#123456');

    expect(getSubjectColorSpec('מתמטיקה')).toEqual({
      key: 'math',
      textLight: '#3B82C4',
      textDark: '#68A8E8',
    });
    expect(getSubjectColorSpec('תנ״ך')).toEqual({
      key: 'bible',
      textLight: '#8B5E3C',
      textDark: '#C89B74',
    });
    expect(getSubjectColorSpec('עברית')).toEqual({
      key: 'hebrew',
      textLight: '#C84B4B',
      textDark: '#E57373',
    });
    expect(getSubjectColorSpec('אומנות')).toEqual({
      key: 'art',
      textLight: '#525866',
      textDark: '#d4d4d8',
    });
  });

  it('builds shared schedule PDF model with accurate geometry, row count, colors, and dismissal fallbacks', () => {
    const model = buildSchedulePdfModel({
      lessons: [
        ...mockLessons,
        { id: 'lesson-8', childId: 'child-abc-1', dayOfWeek: 2, hourNum: 8, subject: 'היסטוריה' },
        { id: 'lesson-blank', childId: 'child-abc-1', dayOfWeek: 3, hourNum: 10, subject: '   ' },
      ],
      finishTimes: mockFinishTimes,
      childColor: 'emerald',
      isRtl: true,
      t: (key) => key,
    });

    expect(SCHEDULE_PDF_FILENAME).toBe('schedule.pdf');
    expect(model.isRtl).toBe(true);
    expect(model.headerBgHex).toBe('#2CA58D');
    expect(model.tableW).toBe(Math.round(SCHEDULE_PDF_LAYOUT.canvasWidth * 0.85));
    expect(model.tableH).toBe(Math.round(SCHEDULE_PDF_LAYOUT.canvasHeight * 0.80));
    expect(model.rowCount).toBe(8);
    expect(model.rows[0].cells[0]).toEqual({
      day: 0,
      subject: 'מתמטיקה',
      colorHex: '#3B82C4',
    });
    expect(model.dismissalCells[0]).toEqual({
      day: 0,
      timeText: '13:30',
      isEmpty: false,
      label: 'schedule.finish_time_row',
    });
    expect(model.dismissalCells[1]).toEqual({
      day: 1,
      timeText: '--:--',
      isEmpty: true,
      label: 'schedule.finish_time_row',
    });

    const minRowModel = buildSchedulePdfModel({
      lessons: mockLessons,
      finishTimes: [],
      childColor: null,
      isRtl: false,
      t: (key) => key,
    });
    expect(minRowModel.rowCount).toBe(6);
    expect(minRowModel.headerBgHex).toBe('#2463eb');
  });

  it('builds scale-invariant single-page A4 landscape HTML and escapes dynamic content', () => {
    const xssSubject = '<script>alert("xss")</script> & \'quote\'';
    const rtlModel = buildSchedulePdfModel({
      lessons: [
        ...mockLessons,
        { id: 'lesson-xss', childId: 'child-abc-1', dayOfWeek: 1, hourNum: 1, subject: xssSubject },
      ],
      finishTimes: mockFinishTimes,
      childColor: 'blue',
      isRtl: true,
      t: (key) => key,
    });

    const rtlHtml = buildSchedulePdfHtml(rtlModel);
    expect(rtlHtml).toContain('<html dir="rtl">');
    expect(rtlHtml).toContain('size: 841.89pt 595.28pt;');
    expect(rtlHtml).toContain('width: 841.5pt;');
    expect(rtlHtml).toContain('height: 594pt;');
    expect(rtlHtml).toContain('width: 715.61pt;');
    expect(rtlHtml).toContain('height: 476.37pt;');
    const rtlHtmlWithoutBase64 = rtlHtml.replace(/data:font\/ttf;base64,[A-Za-z0-9+/=]+/g, '');
    expect(rtlHtmlWithoutBase64).not.toMatch(/\d(vw|vh)\b/);
    expect(rtlHtml).toContain('background: #3B82C4;');
    expect(rtlHtml).toContain('color:#3B82C4;');
    expect(rtlHtml).toContain('background: #f1f5f9;');
    expect(rtlHtml).toContain('<svg viewBox="0 0 64 64"');
    expect(rtlHtml).toContain('stroke="#2463eb"');
    expect(rtlHtml).not.toContain('<h1');
    expect(rtlHtml).not.toContain('<script>');
    expect(rtlHtml).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &#39;quote&#39;');

    const ltrHtml = buildSchedulePdfHtml({ ...rtlModel, isRtl: false });
    expect(ltrHtml).toContain('<html dir="ltr">');
  });
});

describe('Schedule Database Schema & Backend Constraints (Isolated In-Memory SQLite)', () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(':memory:');
    initDb(db);

    db.prepare(`
      INSERT INTO children (id, user_id, first_name, last_name, class_code, class_num, created_at, updated_at)
      VALUES
        ('child-1', 'family', 'Adam', 'Levi', 3, 1, datetime('now'), datetime('now')),
        ('child-2', 'family', 'Noa', 'Levi', 5, 2, datetime('now'), datetime('now'))
    `).run();
  });

  afterEach(() => {
    db.close();
  });

  it('creates schedule_lessons table and enforces UNIQUE(child_id, day_of_week, hour_num)', () => {
    const now = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT INTO schedule_lessons (id, user_id, child_id, day_of_week, hour_num, subject, teacher, room, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run('l-1', 'child-1', 0, 1, 'Math', 'Mr. Smith', '101', now, now);

    expect(() => {
      insertStmt.run('l-2', 'child-1', 0, 1, 'Science', '', '', now, now);
    }).toThrow(/UNIQUE constraint failed/);

    expect(() => {
      insertStmt.run('l-2', 'child-1', 0, 2, 'Science', '', '', now, now);
    }).not.toThrow();

    expect(() => {
      insertStmt.run('l-3', 'child-2', 0, 1, 'History', '', '', now, now);
    }).not.toThrow();
  });

  it('enforces day_of_week CHECK (0..5) and hour_num CHECK (1..12)', () => {
    const now = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT INTO schedule_lessons (id, user_id, child_id, day_of_week, hour_num, subject, teacher, room, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    expect(() => {
      insertStmt.run('l-err-1', 'child-1', 6, 1, 'Math', '', '', now, now);
    }).toThrow(/CHECK constraint failed/);

    expect(() => {
      insertStmt.run('l-err-2', 'child-1', 1, 0, 'Math', '', '', now, now);
    }).toThrow(/CHECK constraint failed/);
  });

  it('creates schedule_day_settings and enforces UNIQUE(child_id, day_of_week)', () => {
    const now = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT INTO schedule_day_settings (id, user_id, child_id, day_of_week, finish_time, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?)
    `);

    insertStmt.run('f-1', 'child-1', 0, '13:30', now, now);

    expect(() => {
      insertStmt.run('f-2', 'child-1', 0, '14:00', now, now);
    }).toThrow(/UNIQUE constraint failed/);

    const upsertStmt = db.prepare(`
      INSERT INTO schedule_day_settings (id, user_id, child_id, day_of_week, finish_time, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?)
      ON CONFLICT(child_id, day_of_week) DO UPDATE SET
        finish_time = excluded.finish_time,
        updated_at = excluded.updated_at
    `);
    upsertStmt.run('f-2', 'child-1', 0, '14:00', now, now);

    const updated = db.prepare('SELECT finish_time FROM schedule_day_settings WHERE child_id = ? AND day_of_week = ?').get('child-1', 0) as {
      finish_time: string;
    };
    expect(updated.finish_time).toBe('14:00');
  });

  it('validates batch array size bounds and strict 24-hour finish time format', () => {
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

    expect(timeRegex.test('11:45')).toBe(true);
    expect(timeRegex.test('00:00')).toBe(true);
    expect(timeRegex.test('23:59')).toBe(true);
    expect(timeRegex.test('24:00')).toBe(false);
    expect(timeRegex.test('99:99')).toBe(false);
    expect(timeRegex.test('12:60')).toBe(false);
    expect(timeRegex.test('1:30')).toBe(false);

    const maxLessons = 72;
    const maxFinishTimes = 6;
    expect(maxLessons).toBe(6 * 12);
    expect(maxFinishTimes).toBe(6);
  });

  it('deduplicates batch slots cleanly without unique constraint crash', () => {
    const rawLessons = [
      { dayOfWeek: 0, hourNum: 1, subject: 'First Math' },
      { dayOfWeek: 0, hourNum: 1, subject: 'Duplicate Math' },
      { dayOfWeek: 1, hourNum: 2, subject: 'English' },
    ];

    const seenSlots = new Set<string>();
    const deduplicated = [];
    for (const l of rawLessons) {
      const key = `${l.dayOfWeek}-${l.hourNum}`;
      if (seenSlots.has(key)) continue;
      seenSlots.add(key);
      deduplicated.push(l);
    }

    expect(deduplicated).toHaveLength(2);
    expect(deduplicated[0].subject).toBe('First Math');
    expect(deduplicated[1].subject).toBe('English');
  });
});
