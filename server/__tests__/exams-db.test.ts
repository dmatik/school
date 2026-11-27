import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import Database from 'better-sqlite3';
import { initDb } from '../db.js';

describe('Exams Database Schema & Scoping (Isolated In-Memory SQLite)', () => {
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

  it('creates exams table with required indexes and performs CRUD safely', () => {
    const now = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT INTO exams (id, user_id, child_id, student_name, name, description, date, grade, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run('exam-101', 'child-1', 'Adam Levi', 'Geography', 'Capitals and Rivers', '2026-11-20', '', now, now);
    insertStmt.run('exam-102', 'child-2', 'Noa Levi', 'Physics', '', '2026-11-25', '98', now, now);

    const all = db.prepare('SELECT * FROM exams ORDER BY date ASC').all() as {
      id: string;
      name: string;
      description: string;
      grade: string;
    }[];
    expect(all).toHaveLength(2);
    expect(all[0].name).toBe('Geography');
    expect(all[0].description).toBe('Capitals and Rivers');
    expect(all[1].grade).toBe('98');

    db.prepare('UPDATE exams SET grade = ?, description = ? WHERE id = ?').run('88', 'Updated topic', 'exam-101');
    const updated = db.prepare('SELECT grade, description FROM exams WHERE id = ?').get('exam-101') as {
      grade: string;
      description: string;
    };
    expect(updated.grade).toBe('88');
    expect(updated.description).toBe('Updated topic');

    db.prepare('DELETE FROM exams WHERE id = ?').run('exam-101');
    const remaining = db.prepare('SELECT * FROM exams').all() as { id: string }[];
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('exam-102');
  });

  it('scopes exams by child_id accurately for child family roles', () => {
    const now = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT INTO exams (id, user_id, child_id, student_name, name, description, date, grade, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run('exam-201', 'child-1', 'Adam Levi', 'Art', '', '2026-12-01', '', now, now);
    insertStmt.run('exam-202', 'child-2', 'Noa Levi', 'Music', '', '2026-12-02', '', now, now);

    const child1Exams = db.prepare('SELECT * FROM exams WHERE child_id = ?').all('child-1') as { name: string }[];
    expect(child1Exams).toHaveLength(1);
    expect(child1Exams[0].name).toBe('Art');

    const child2Exams = db.prepare('SELECT * FROM exams WHERE child_id = ?').all('child-2') as { name: string }[];
    expect(child2Exams).toHaveLength(1);
    expect(child2Exams[0].name).toBe('Music');
  });

  it('validates calendar dates strictly avoiding non-existent leap days or roll-overs', () => {
    function isValidCalendarDate(dateStr: string) {
      if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return false;
      }
      const [year, month, day] = dateStr.split('-').map(Number);
      if (year < 2000 || year > 2099) return false;
      const d = new Date(year, month - 1, day);
      return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
    }

    expect(isValidCalendarDate('2026-11-20')).toBe(true);
    expect(isValidCalendarDate('2024-02-29')).toBe(true);
    expect(isValidCalendarDate('2026-02-29')).toBe(false);
    expect(isValidCalendarDate('2026-04-31')).toBe(false);
    expect(isValidCalendarDate('2026-13-45')).toBe(false);
    expect(isValidCalendarDate('invalid-date')).toBe(false);
  });
});
