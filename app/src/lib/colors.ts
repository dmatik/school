export interface ThemePalette {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  destructive: string;
  destructiveForeground: string;
  destructiveSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  border: string;
  borderSubtle: string;
  infoBoxBg: string;
  inputBg: string;
  switchTrackOff: string;
  teal: string;
  tealSoft: string;
  amber: string;
  amberSoft: string;
  glassBg: string;
  glassBorder: string;
}

export const LIGHT_PALETTE: ThemePalette = {
  background: '#f6f7fc',
  foreground: '#0f172a',
  card: '#ffffff',
  cardForeground: '#0f172a',
  popover: '#ffffff',
  primary: '#3B82C4',
  primaryForeground: '#ffffff',
  secondary: '#edf2f7',
  secondaryForeground: '#0f172a',
  muted: '#eef2f7',
  mutedForeground: '#64748b',
  accent: '#e2e8f0',
  destructive: '#ef4444',
  destructiveForeground: '#ffffff',
  destructiveSoft: 'rgba(239, 68, 68, 0.14)',
  success: '#16a34a',
  successSoft: 'rgba(22, 163, 74, 0.14)',
  warning: '#d97706',
  warningSoft: 'rgba(217, 119, 6, 0.14)',
  border: '#d6dde6',
  borderSubtle: 'rgba(214, 221, 230, 0.45)',
  infoBoxBg: 'rgba(238, 242, 247, 0.48)',
  inputBg: '#eef2f7',
  switchTrackOff: '#d6dde6',
  teal: '#2CA58D',
  tealSoft: 'rgba(44, 165, 141, 0.15)',
  amber: '#D4973B',
  amberSoft: 'rgba(212, 151, 59, 0.12)',
  glassBg: 'rgba(255, 255, 255, 0.58)',
  glassBorder: 'rgba(15, 23, 42, 0.18)',
};

export const DARK_PALETTE: ThemePalette = {
  background: '#090d16',
  foreground: '#f8fafc',
  card: '#19202e',
  cardForeground: '#f8fafc',
  popover: '#1b2232',
  primary: '#579ee0',
  primaryForeground: '#090d16',
  secondary: '#232c3d',
  secondaryForeground: '#f8fafc',
  muted: '#222b3a',
  mutedForeground: '#94a3b8',
  accent: '#263042',
  destructive: '#ef4444',
  destructiveForeground: '#ffffff',
  destructiveSoft: 'rgba(239, 68, 68, 0.18)',
  success: '#22c55e',
  successSoft: 'rgba(34, 197, 94, 0.18)',
  warning: '#f59e0b',
  warningSoft: 'rgba(245, 158, 11, 0.18)',
  border: '#2e384a',
  borderSubtle: 'rgba(46, 56, 74, 0.65)',
  infoBoxBg: 'rgba(35, 44, 61, 0.80)',
  inputBg: '#232c3d',
  switchTrackOff: '#2e384a',
  teal: '#9EE8D8',
  tealSoft: 'rgba(44, 165, 141, 0.25)',
  amber: '#F5D59E',
  amberSoft: 'rgba(212, 151, 59, 0.18)',
  glassBg: 'rgba(52, 62, 78, 0.56)',
  glassBorder: 'rgba(255, 255, 255, 0.22)',
};

export interface ChildColorToken {
  id: string;
  labelKey: string;
  solidBg: string;
  badgeBgLight: string;
  badgeTextLight: string;
  badgeBgDark: string;
  badgeTextDark: string;
}

export const CHILD_COLOR_TOKENS: ChildColorToken[] = [
  {
    id: 'blue',
    labelKey: 'account.color_blue',
    solidBg: '#3B82C4',
    badgeBgLight: '#D4E6F9',
    badgeTextLight: '#16324F',
    badgeBgDark: 'rgba(59, 130, 196, 0.25)',
    badgeTextDark: '#AED4F8',
  },
  {
    id: 'emerald',
    labelKey: 'account.color_emerald',
    solidBg: '#2CA58D',
    badgeBgLight: '#CBEEE8',
    badgeTextLight: '#143D35',
    badgeBgDark: 'rgba(44, 165, 141, 0.25)',
    badgeTextDark: '#9EE8D8',
  },
  {
    id: 'purple',
    labelKey: 'account.color_purple',
    solidBg: '#8A63B8',
    badgeBgLight: '#E5DAF3',
    badgeTextLight: '#321F47',
    badgeBgDark: 'rgba(138, 99, 184, 0.25)',
    badgeTextDark: '#D8C2F2',
  },
  {
    id: 'amber',
    labelKey: 'account.color_amber',
    solidBg: '#D4973B',
    badgeBgLight: '#F6E6C8',
    badgeTextLight: '#4A320E',
    badgeBgDark: 'rgba(212, 151, 59, 0.25)',
    badgeTextDark: '#F5D59E',
  },
  {
    id: 'rose',
    labelKey: 'account.color_rose',
    solidBg: '#C86478',
    badgeBgLight: '#F5D8DF',
    badgeTextLight: '#4A1C26',
    badgeBgDark: 'rgba(200, 100, 120, 0.25)',
    badgeTextDark: '#F2B6C3',
  },
  {
    id: 'cyan',
    labelKey: 'account.color_cyan',
    solidBg: '#3D98B8',
    badgeBgLight: '#CEEAF4',
    badgeTextLight: '#153B4A',
    badgeBgDark: 'rgba(61, 152, 184, 0.25)',
    badgeTextDark: '#A5DEF2',
  },
  {
    id: 'orange',
    labelKey: 'account.color_orange',
    solidBg: '#D4764E',
    badgeBgLight: '#F6DDD2',
    badgeTextLight: '#4A2313',
    badgeBgDark: 'rgba(212, 118, 78, 0.25)',
    badgeTextDark: '#F5C0A9',
  },
  {
    id: 'indigo',
    labelKey: 'account.color_indigo',
    solidBg: '#555DB0',
    badgeBgLight: '#D8DAF2',
    badgeTextLight: '#1E2246',
    badgeBgDark: 'rgba(85, 93, 176, 0.25)',
    badgeTextDark: '#C5C8F5',
  },
];

export function getChildBadgeStyle(colorId: string | null | undefined, isDark: boolean) {
  const found = CHILD_COLOR_TOKENS.find((c) => c.id === colorId);
  if (!found) {
    return {
      bg: isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(100, 116, 139, 0.12)',
      text: isDark ? '#e2e8f0' : '#334155',
      solid: '#64748b',
    };
  }
  return {
    bg: isDark ? found.badgeBgDark : found.badgeBgLight,
    text: isDark ? found.badgeTextDark : found.badgeTextLight,
    solid: found.solidBg,
  };
}
