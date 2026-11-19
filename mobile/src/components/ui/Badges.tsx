import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
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
  const colors = getChildBadgeStyle(colorId, isDark);
  const bg = variant === 'solid' && colorId ? colors.solid : colors.bg;
  const textColor = variant === 'solid' && colorId ? '#ffffff' : colors.text;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          paddingHorizontal: size === 'xs' ? 8 : 10,
          paddingVertical: size === 'xs' ? 2 : 4,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.badgeText,
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
  size?: 'sm' | 'md';
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

  const boxSize = size === 'md' ? 34 : 26;
  const iconSize = size === 'md' ? 18 : 14;

  return (
    <View
      style={{
        width: boxSize,
        height: boxSize,
        borderRadius: 8,
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
}: {
  user?: Pick<User, 'firstName' | 'lastName' | 'username' | 'avatar'> | null;
  size?: number;
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
          borderWidth: 1,
          borderColor: palette.border,
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
        backgroundColor: 'rgba(59, 130, 196, 0.14)',
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 196, 0.28)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: palette.primary,
          fontWeight: '700',
          fontSize: Math.round(size * 0.38),
        }}
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
    fontWeight: '600',
  },
});
