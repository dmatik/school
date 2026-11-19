import {
  Calculator,
  Languages,
  FlaskConical,
  Scroll,
  Palette,
  Dumbbell,
  BookOpen,
  Landmark,
  Compass,
  Music,
  Laptop,
  Gamepad2,
  HeartHandshake,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';

export interface MobileSubjectConfig {
  icon: LucideIcon;
  badgeBgLight: string;
  badgeTextLight: string;
  badgeBgDark: string;
  badgeTextDark: string;
  solidBgLight: string;
  solidTextLight: string;
  solidBgDark: string;
  solidTextDark: string;
}

const DARK_GREY_BASE = {
  badgeBgLight: 'rgba(113, 113, 122, 0.15)',
  badgeTextLight: '#3f3f46',
  badgeBgDark: 'rgba(161, 161, 170, 0.15)',
  badgeTextDark: '#d4d4d8',
  solidBgLight: '#525866',
  solidTextLight: '#ffffff',
  solidBgDark: '#454B57',
  solidTextDark: '#ffffff',
};

const DEFAULT_CONFIG: MobileSubjectConfig = {
  icon: BookOpen,
  ...DARK_GREY_BASE,
};

function darkGreySubject(icon: LucideIcon): MobileSubjectConfig {
  return { icon, ...DARK_GREY_BASE };
}

export function getSubjectConfig(subjectName?: string | null): MobileSubjectConfig {
  if (!subjectName) return DEFAULT_CONFIG;
  const s = subjectName.toLowerCase().replace(/[\u05F3\u05F4'"״׳”″`]/g, '').trim();

  if (/מתמט|חשבון|הנדסה|גאומטר|אלגבר|math/.test(s)) {
    return {
      icon: Calculator,
      badgeBgLight: 'rgba(59, 130, 246, 0.15)',
      badgeTextLight: '#1d4ed8',
      badgeBgDark: 'rgba(59, 130, 246, 0.2)',
      badgeTextDark: '#93c5fd',
      solidBgLight: '#3B82C4',
      solidTextLight: '#DCEBFB',
      solidBgDark: '#3474B0',
      solidTextDark: '#E5F0FC',
    };
  }

  if (/אנגל|english|ערבית|צרפתית|שפה זרה/.test(s)) {
    return {
      icon: Languages,
      badgeBgLight: 'rgba(168, 85, 247, 0.15)',
      badgeTextLight: '#7e22ce',
      badgeBgDark: 'rgba(168, 85, 247, 0.2)',
      badgeTextDark: '#d8b4fe',
      solidBgLight: '#8A63B8',
      solidTextLight: '#EBE2F7',
      solidBgDark: '#7A56A6',
      solidTextDark: '#F0E9F9',
    };
  }

  if (/מדע|טבע|טכנול|פיזיק|כימי|ביולוג|אקולוג|science/.test(s)) {
    return {
      icon: FlaskConical,
      badgeBgLight: 'rgba(16, 185, 129, 0.15)',
      badgeTextLight: '#047857',
      badgeBgDark: 'rgba(16, 185, 129, 0.2)',
      badgeTextDark: '#6ee7b7',
      solidBgLight: '#2CA58D',
      solidTextLight: '#D4F2EC',
      solidBgDark: '#25917B',
      solidTextDark: '#DFF6F1',
    };
  }

  if (/תנך|תורה|תושבע|משנה|גמרא/.test(s)) {
    return {
      icon: Scroll,
      badgeBgLight: 'rgba(139, 94, 60, 0.15)',
      badgeTextLight: '#6F482A',
      badgeBgDark: 'rgba(139, 94, 60, 0.25)',
      badgeTextDark: '#D9B391',
      solidBgLight: '#8B5E3C',
      solidTextLight: '#F5EBE1',
      solidBgDark: '#7A5234',
      solidTextDark: '#F8F1EA',
    };
  }

  if (/מורשת|יהדות|תרבות/.test(s)) return darkGreySubject(Scroll);
  if (/אומנ|אמנ|ציור|פיסול|יצירה|art/.test(s)) return darkGreySubject(Palette);

  if (/חנג|ספורט|כושר|חינוך גופני|pe|sport/.test(s)) {
    return {
      icon: Dumbbell,
      badgeBgLight: 'rgba(245, 158, 11, 0.15)',
      badgeTextLight: '#b45309',
      badgeBgDark: 'rgba(245, 158, 11, 0.2)',
      badgeTextDark: '#fcd34d',
      solidBgLight: '#D4973B',
      solidTextLight: '#F9EED8',
      solidBgDark: '#BE8532',
      solidTextDark: '#FBF3E2',
    };
  }

  if (/היסטור|אזרחות|שלח|history/.test(s)) {
    return {
      icon: Landmark,
      badgeBgLight: 'rgba(6, 182, 212, 0.15)',
      badgeTextLight: '#0e7490',
      badgeBgDark: 'rgba(6, 182, 212, 0.2)',
      badgeTextDark: '#67e8f9',
      solidBgLight: '#3D98B8',
      solidTextLight: '#D8EFF7',
      solidBgDark: '#3486A3',
      solidTextDark: '#E2F3F9',
    };
  }

  if (/גאוגר|גיאוגר|מולדת|ארץ ישראל|geography/.test(s)) return darkGreySubject(Compass);
  if (/מוזיק|מוסיק|שירה|נגינה|מקהלה|music/.test(s)) return darkGreySubject(Music);
  if (/מחשב|סייבר|רובוט|קוד|תוכנה|תכנות|coding|computer/.test(s)) return darkGreySubject(Laptop);
  if (/משחק|דרמה|תאטרון|תיאטרון/.test(s)) return darkGreySubject(Gamepad2);
  if (/כישורי חיים|חינוך|מעגל שיח/.test(s)) return darkGreySubject(HeartHandshake);
  if (/פרטני|זמן פלוס|העשרה|מצוינות|אמירים/.test(s)) return darkGreySubject(Sparkles);

  if (/עברית|לשון|ספרות|הבעה|כתיבה|קריאה|שפה/.test(s)) {
    return {
      icon: BookOpen,
      badgeBgLight: 'rgba(239, 68, 68, 0.15)',
      badgeTextLight: '#b91c1c',
      badgeBgDark: 'rgba(239, 68, 68, 0.2)',
      badgeTextDark: '#fca5a5',
      solidBgLight: '#C84B4B',
      solidTextLight: '#FBE4E4',
      solidBgDark: '#B23E3E',
      solidTextDark: '#FCECEC',
    };
  }

  return DEFAULT_CONFIG;
}
