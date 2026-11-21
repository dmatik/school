import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useDirection } from '../../i18n';
import { heeboFont } from '../../theme/typography';
import { getChildBadgeStyle } from '../../lib/colors';
import { getSubjectConfig } from '../../lib/subjectIcons';
import type { User } from '../../../../src/types';

export function ChildBadge({
  name,
  colorId,
  variant = 'tinted',
  size = 'sm',
}: {
  name: string;
  colorId?: string | null;
  variant?: 'tinted' | 'solid';
  size?: 'xs' | 'sm';
}) {
  const { isDark } = useTheme();
  const { flexRow } = useDirection();
  const colors = getChildBadgeStyle(colorId, isDark);
  const bg = variant === 'solid' && colorId ? colors.solid : colors.bg;
  const textColor = variant === 'solid' && colorId ? '#ffffff' : colors.text;
  const dotColor = variant === 'solid' && colorId ? '#ffffff' : colors.solid;

  return (
    <View
      style={[
        styles.badge,
        {
          flexDirection: flexRow,
          gap: size === 'xs' ? 4 : 6,
          backgroundColor: bg,
          paddingHorizontal: size === 'xs' ? 8 : 10,
          paddingVertical: size === 'xs' ? 2 : 3.5,
        },
      ]}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: dotColor,
        }}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.badgeText,
          heeboFont('600'),
          { color: textColor, fontSize: size === 'xs' ? 11 : 12 },
        ]}
      >
        {name}
      </Text>
    </View>
  );
}

export function StatusBadge({
  label,
  variant = 'neutral',
}: {
  label: string;
  variant?: 'success' | 'destructive' | 'warning' | 'neutral' | 'primary';
}) {
  const { palette } = useTheme();
  const colorMap = {
    success: { bg: palette.successSoft, text: palette.success },
    destructive: { bg: palette.destructiveSoft, text: palette.destructive },
    warning: { bg: palette.warningSoft, text: palette.warning },
    primary: { bg: 'rgba(59, 130, 196, 0.15)', text: palette.primary },
    neutral: { bg: palette.muted, text: palette.mutedForeground },
  }[variant];

  return (
    <View style={[styles.badge, { backgroundColor: colorMap.bg, paddingHorizontal: 10, paddingVertical: 4 }]}>
      <Text numberOfLines={1} style={[styles.badgeText, { color: colorMap.text, fontSize: 11 }]}>
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
    ...heeboFont('600'),
  },
});
