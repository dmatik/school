import { format, parseISO, isToday, isYesterday, isTomorrow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

const HEBREW_GRADES = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'יא', 'יב'];

export function formatGradeHebrew(code: number | string): string {
  const num = typeof code === 'string' ? parseInt(code, 10) : code;
  if (isNaN(num) || num < 1 || num > HEBREW_GRADES.length) {
    return String(code);
  }
  return HEBREW_GRADES[num - 1];
}

export function formatSystemDateTime(dateInput: string | Date): string {
  try {
    const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    return format(d, 'dd/MM/yyyy HH:mm');
  } catch {
    return String(dateInput);
  }
}

export function formatShortDate(dateInput: string | Date): string {
  try {
    const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    return format(d, 'dd/MM/yyyy');
  } catch {
    return String(dateInput);
  }
}

export function formatDateSectionHeader(
  dateStr: string,
  lang: string,
  t: (key: string) => string
): string {
  try {
    const d = parseISO(dateStr);
    const locale = lang.startsWith('en') ? enUS : he;
    const base = format(d, 'EEEE, dd/MM/yyyy', { locale });
    if (isToday(d)) return `${t('common.today')} · ${base}`;
    if (isYesterday(d)) return `${t('common.yesterday')} · ${base}`;
    if (isTomorrow(d)) return `${t('common.tomorrow')} · ${base}`;
    return base;
  } catch {
    return dateStr;
  }
}
