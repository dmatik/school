import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import {
  CheckCircle2,
  Globe,
  Award,
  Shield,
  Users,
  Baby,
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useDirection } from '../../i18n';
import { heeboFont } from '../../theme/typography';
import { getChildBadgeStyle } from '../../lib/colors';
import { getSubjectConfig } from '../../lib/subjectIcons';
import type { User } from '../../../../src/types';

export function ChildBadge({
  name,
  colorId,
  variant = 'dot',
  size = 'sm',
}: {
  name: string;
  colorId?: string | null;
  variant?: 'dot' | 'tinted' | 'solid';
  size?: 'xs' | 'sm';
}) {
  const { isDark } = useTheme();
  const { flexRow } = useDirection();
  const colors = getChildBadgeStyle(colorId, isDark);
  const showDot = variant === 'dot' || variant === 'tinted';

  return (
    <View
      style={[
        styles.badge,
        {
          flexDirection: flexRow,
          gap: showDot ? (size === 'xs' ? 4 : 6) : 4,
          backgroundColor: colors.bg,
          paddingHorizontal: size === 'xs' ? 8 : 10,
          paddingVertical: size === 'xs' ? 2 : 3.5,
        },
      ]}
    >
      {showDot ? (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.solid,
          }}
        />
      ) : null}
      <Text
        numberOfLines={1}
        style={[
          styles.badgeText,
          heeboFont('600'),
          { color: colors.text, fontSize: size === 'xs' ? 11 : 12 },
        ]}
      >
        {name}
      </Text>
    </View>
  );
}

export type StatusBadgeVariant =
  | 'success'
  | 'neutral'
  | 'grade'
  | 'admin'
  | 'user'
  | 'parent'
  | 'child'
  | 'custom'
  | 'primary'
  | 'warning'
  | 'destructive';

export function StatusBadge({
  label,
  variant = 'neutral',
  icon: CustomIcon,
}: {
  label: string;
  variant?: StatusBadgeVariant;
  icon?: LucideIcon | null;
}) {
  const { palette, isDark } = useTheme();
  const { flexRow } = useDirection();

  let defaultIcon: LucideIcon | null = null;
  let colors: { bg: string; text: string };
  let isBold = false;

  switch (variant) {
    case 'success':
      defaultIcon = CheckCircle2;
      colors = { bg: palette.tealSoft, text: palette.teal };
      break;
    case 'neutral':
      defaultIcon = Globe;
      colors = { bg: palette.muted, text: palette.mutedForeground };
      break;
    case 'grade':
      defaultIcon = Award;
      colors = {
        bg: isDark ? 'rgba(85, 93, 176, 0.25)' : 'rgba(85, 93, 176, 0.15)',
        text: isDark ? '#C5C8F5' : '#555DB0',
      };
      isBold = true;
      break;
    case 'admin':
      defaultIcon = Shield;
      colors = {
        bg: isDark ? 'rgba(212, 151, 59, 0.25)' : 'rgba(212, 151, 59, 0.15)',
        text: isDark ? '#F5D59E' : '#D4973B',
      };
      break;
    case 'user':
    case 'primary':
      defaultIcon = variant === 'user' ? Shield : null;
      colors = {
        bg: isDark ? 'rgba(59, 130, 196, 0.25)' : 'rgba(59, 130, 196, 0.15)',
        text: isDark ? '#AED4F8' : '#3B82C4',
      };
      break;
    case 'parent':
      defaultIcon = Users;
      colors = {
        bg: isDark ? 'rgba(138, 99, 184, 0.25)' : 'rgba(138, 99, 184, 0.15)',
        text: isDark ? '#D8C2F2' : '#8A63B8',
      };
      break;
    case 'child':
      defaultIcon = Baby;
      colors = { bg: palette.tealSoft, text: palette.teal };
      break;
    case 'warning':
      defaultIcon = null;
      colors = { bg: palette.warningSoft, text: palette.warning };
      break;
    case 'destructive':
      defaultIcon = null;
      colors = { bg: palette.destructiveSoft, text: palette.destructive };
      break;
    case 'custom':
    default:
      defaultIcon = null;
      colors = { bg: palette.muted, text: palette.foreground };
      break;
  }

  const IconComponent = CustomIcon !== undefined ? CustomIcon : defaultIcon;

  return (
    <View
      style={[
        styles.badge,
        {
          flexDirection: flexRow,
          gap: 6,
          backgroundColor: colors.bg,
          paddingHorizontal: 10,
          paddingVertical: 4,
        },
      ]}
    >
      {IconComponent ? <IconComponent size={14} color={colors.text} /> : null}
      <Text
        numberOfLines={1}
        style={[
          styles.badgeText,
          heeboFont(isBold ? '700' : '500'),
          { color: colors.text, fontSize: 12 },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function SubjectIconBadge({
  subject,
  variant = 'tinted',
  size = 'sm',
}: {
  subject: string;
  variant?: 'tinted' | 'solid';
  size?: 'sm' | 'md' | 'lg';
}) {
  const { isDark } = useTheme();
  const cfg = getSubjectConfig(subject);
  const Icon = cfg.icon;
  const bg =
    variant === 'solid'
      ? isDark
        ? cfg.solidBgDark
        : cfg.solidBgLight
      : isDark
      ? cfg.badgeBgDark
      : cfg.badgeBgLight;
  const textColor =
    variant === 'solid'
      ? isDark
        ? cfg.solidTextDark
        : cfg.solidTextLight
      : isDark
      ? cfg.badgeTextDark
      : cfg.badgeTextLight;

  const boxSize = size === 'lg' ? 40 : size === 'md' ? 34 : 26;
  const iconSize = size === 'lg' ? 20 : size === 'md' ? 18 : 14;
  const radius = size === 'lg' ? 12 : 8;

  return (
    <View
      style={{
        width: boxSize,
        height: boxSize,
        borderRadius: radius,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={iconSize} color={textColor} />
    </View>
  );
}

export function UserAvatar({
  user,
  size = 36,
  activeRing = false,
}: {
  user?: Pick<User, 'firstName' | 'lastName' | 'username' | 'avatar'> | null;
  size?: number;
  activeRing?: boolean;
}) {
  const { palette } = useTheme();
  const initials =
    [user?.firstName?.[0], user?.lastName?.[0]]
      .filter(Boolean)
      .join('')
      .toUpperCase() ||
    user?.username?.[0]?.toUpperCase() ||
    '?';

  if (user?.avatar) {
    return (
      <Image
        source={{ uri: user.avatar }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: activeRing ? 2 : 1,
          borderColor: activeRing ? palette.primary : palette.border,
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: palette.primary,
        borderWidth: activeRing ? 2 : 0,
        borderColor: activeRing ? palette.foreground : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={[
          heeboFont('700'),
          {
            color: palette.primaryForeground,
            fontSize: Math.round(size * 0.39),
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
