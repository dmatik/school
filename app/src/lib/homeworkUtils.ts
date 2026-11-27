import type { ConsolidatedHomeworkItem, HomeworkItem } from '../../../shared/types';

/**
 * Extracts only the actual homework text from a homework item.
 * Never falls back to displaying the lesson topic or what was taught in class.
 */
export function getHomeworkText(hw: {
  description?: string | null;
  lessonSubject?: string | null;
  rawData?: string | null;
}): string {
  if (hw.rawData) {
    try {
      const raw = typeof hw.rawData === 'string' ? JSON.parse(hw.rawData) : hw.rawData;
      if (raw && typeof raw === 'object') {
        if ('homeWork' in raw) {
          return raw.homeWork ? String(raw.homeWork).trim() : '';
        }
        if ('homeworkData' in raw) {
          return raw.homeworkData ? String(raw.homeworkData).trim() : '';
        }
      }
    } catch {
      // ignore parse error and proceed to fallback
    }
  }

  if (hw.lessonSubject && hw.description && hw.description.trim() === hw.lessonSubject.trim()) {
    return '';
  }

  return hw.description ? hw.description.trim() : '';
}

/**
 * Consolidates homework items so that if the same student has the same subject
 * multiple times on the same date with identical homework text, only one card is displayed
 * with all relevant lesson numbers combined. Items without actual homework are excluded.
 */
export function consolidateHomework(items: HomeworkItem[]): ConsolidatedHomeworkItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  const map = new Map<string, ConsolidatedHomeworkItem>();

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const hwText = getHomeworkText(item).trim();
    if (!hwText) {
      continue;
    }

    const studentKey = (
      item.childId?.trim() ||
      item.studentId?.trim() ||
      item.studentName?.trim() ||
      ''
    ).toLowerCase();
    const dateKey = item.dueDate || '';
    const subjectKey = (item.subject || '').trim().toLowerCase().normalize('NFC');
    const textKey = hwText.replace(/\s+/g, ' ').normalize('NFC');

    const groupKey = `${studentKey}:::${dateKey}:::${subjectKey}:::${textKey}`;
    const existing = map.get(groupKey);

    const val = item.hourNum as unknown;
    const rawHour = typeof val === 'string' ? val.trim() : val;
    const hourNum =
      rawHour !== '' &&
      rawHour !== null &&
      typeof rawHour !== 'boolean' &&
      rawHour !== undefined &&
      Number.isInteger(Number(rawHour)) &&
      Number(rawHour) >= 0 &&
      Number(rawHour) <= 24
        ? Number(rawHour)
        : null;

    if (!existing) {
      map.set(groupKey, {
        ...item,
        ids: item.id ? [item.id] : [],
        hourNums: hourNum !== null ? [hourNum] : [],
      });
    } else {
      if (item.id && !existing.ids.includes(item.id)) {
        existing.ids.push(item.id);
      }
      if (hourNum !== null && !existing.hourNums.includes(hourNum)) {
        existing.hourNums.push(hourNum);
        existing.hourNums.sort((a, b) => a - b);
        existing.hourNum = existing.hourNums[0];
      }
      if (!existing.teacher && item.teacher) {
        existing.teacher = item.teacher;
      }
    }
  }

  return Array.from(map.values());
}
