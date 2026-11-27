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
import {
  DEFAULT_SUBJECT_TEXT_DARK,
  DEFAULT_SUBJECT_TEXT_LIGHT,
  getSubjectColorSpec,
  type SubjectCategoryKey,
} from '../../../shared/lib/subject-palette';

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
  textLight: string;
  textDark: string;
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
  textLight: DEFAULT_SUBJECT_TEXT_LIGHT,
  textDark: DEFAULT_SUBJECT_TEXT_DARK,
};

const DEFAULT_CONFIG: MobileSubjectConfig = {
  icon: BookOpen,
  ...DARK_GREY_BASE,
};

function darkGreySubject(icon: LucideIcon): MobileSubjectConfig {
  return { icon, ...DARK_GREY_BASE };
}

const MOBILE_SUBJECT_CONFIG_BY_KEY: Record<
  SubjectCategoryKey,
  Omit<MobileSubjectConfig, 'textLight' | 'textDark'>
> = {
  math: {
    icon: Calculator,
    badgeBgLight: 'rgba(59, 130, 246, 0.15)',
    badgeTextLight: '#1d4ed8',
    badgeBgDark: 'rgba(59, 130, 246, 0.2)',
    badgeTextDark: '#93c5fd',
    solidBgLight: '#3B82C4',
    solidTextLight: '#DCEBFB',
    solidBgDark: '#3474B0',
    solidTextDark: '#E5F0FC',
  },
  english: {
    icon: Languages,
    badgeBgLight: 'rgba(168, 85, 247, 0.15)',
    badgeTextLight: '#7e22ce',
    badgeBgDark: 'rgba(168, 85, 247, 0.2)',
    badgeTextDark: '#d8b4fe',
    solidBgLight: '#8A63B8',
    solidTextLight: '#EBE2F7',
    solidBgDark: '#7A56A6',
    solidTextDark: '#F0E9F9',
  },
  science: {
    icon: FlaskConical,
    badgeBgLight: 'rgba(16, 185, 129, 0.15)',
    badgeTextLight: '#047857',
    badgeBgDark: 'rgba(16, 185, 129, 0.2)',
    badgeTextDark: '#6ee7b7',
    solidBgLight: '#2CA58D',
    solidTextLight: '#D4F2EC',
    solidBgDark: '#25917B',
    solidTextDark: '#DFF6F1',
  },
  bible: {
    icon: Scroll,
    badgeBgLight: 'rgba(139, 94, 60, 0.15)',
    badgeTextLight: '#6F482A',
    badgeBgDark: 'rgba(139, 94, 60, 0.25)',
    badgeTextDark: '#D9B391',
    solidBgLight: '#8B5E3C',
    solidTextLight: '#F5EBE1',
    solidBgDark: '#7A5234',
    solidTextDark: '#F8F1EA',
  },
  heritage: darkGreySubject(Scroll),
  art: darkGreySubject(Palette),
  sports: {
    icon: Dumbbell,
    badgeBgLight: 'rgba(245, 158, 11, 0.15)',
    badgeTextLight: '#b45309',
    badgeBgDark: 'rgba(245, 158, 11, 0.2)',
    badgeTextDark: '#fcd34d',
    solidBgLight: '#D4973B',
    solidTextLight: '#F9EED8',
    solidBgDark: '#BE8532',
    solidTextDark: '#FBF3E2',
  },
  history: {
    icon: Landmark,
    badgeBgLight: 'rgba(6, 182, 212, 0.15)',
    badgeTextLight: '#0e7490',
    badgeBgDark: 'rgba(6, 182, 212, 0.2)',
    badgeTextDark: '#67e8f9',
    solidBgLight: '#3D98B8',
    solidTextLight: '#D8EFF7',
    solidBgDark: '#3486A3',
    solidTextDark: '#E2F3F9',
  },
  geography: darkGreySubject(Compass),
  music: darkGreySubject(Music),
  computers: darkGreySubject(Laptop),
  drama: darkGreySubject(Gamepad2),
  life_skills: darkGreySubject(HeartHandshake),
  enrichment: darkGreySubject(Sparkles),
  hebrew: {
    icon: BookOpen,
    badgeBgLight: 'rgba(239, 68, 68, 0.15)',
    badgeTextLight: '#b91c1c',
    badgeBgDark: 'rgba(239, 68, 68, 0.2)',
    badgeTextDark: '#fca5a5',
    solidBgLight: '#C84B4B',
    solidTextLight: '#FBE4E4',
    solidBgDark: '#B23E3E',
    solidTextDark: '#FCECEC',
  },
  default: DEFAULT_CONFIG,
};

export function getSubjectConfig(subjectName?: string | null): MobileSubjectConfig {
  const { key, textLight, textDark } = getSubjectColorSpec(subjectName);
  const base = MOBILE_SUBJECT_CONFIG_BY_KEY[key] ?? DEFAULT_CONFIG;
  return {
    ...base,
    textLight,
    textDark,
  };
}
