import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { heeboFont } from '../../theme/typography';
import { useDirection } from '../../i18n';

export function CardSurface({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.cardSurface,
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionCard({
  icon: Icon,
  title,
  description,
  action,
  children,
  style,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { palette } = useTheme();
  const { flexRow, textAlign } = useDirection();

  return (
    <CardSurface style={[styles.card, style]}>
      <View style={[styles.cardHeader, { flexDirection: flexRow }]}>
        <View style={[styles.cardTitleGroup, { flexDirection: flexRow }]}>
          {Icon && (
            <View
              style={[
                styles.cardIconWrap,
                { backgroundColor: 'rgba(59, 130, 196, 0.12)' },
              ]}
            >
              <Icon size={18} color={palette.primary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: palette.cardForeground, textAlign }]}>
              {title}
            </Text>
            {description ? (
              <Text style={[styles.cardDesc, { color: palette.mutedForeground, textAlign }]}>
                {description}
              </Text>
            ) : null}
          </View>
        </View>
        {action ? <View>{action}</View> : null}
      </View>
      <View style={styles.cardContent}>{children}</View>
    </CardSurface>
  );
}

export function InfoBox({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.infoBox,
        { backgroundColor: palette.muted, borderColor: palette.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function InfoItem({
  label,
  value,
  isLtr,
}: {
  label: string;
  value: string | null | undefined;
  isLtr?: boolean;
}) {
  const { palette } = useTheme();
  const { textAlign } = useDirection();
  return (
    <View style={styles.infoItem}>
      <Text style={[styles.infoLabel, { color: palette.mutedForeground, textAlign }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.infoValue,
          {
            color: palette.foreground,
            textAlign: isLtr ? 'left' : textAlign,
            writingDirection: isLtr ? 'ltr' : undefined,
          },
        ]}
      >
        {value || '-'}
      </Text>
    </View>
  );
}

export function EmptyStateCard({
  icon: Icon,
  title,
  description,
  action,
  centered = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  centered?: boolean;
}) {
  const { palette } = useTheme();
  const card = (
    <CardSurface style={styles.emptyCard}>
      <View style={[styles.emptyIcon, { backgroundColor: palette.muted }]}>
        <Icon size={28} color={palette.mutedForeground} />
      </View>
      <Text style={[styles.emptyTitle, { color: palette.foreground }]}>{title}</Text>
      {description ? (
        <Text style={[styles.emptyDesc, { color: palette.mutedForeground }]}>
          {description}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: 12 }}>{action}</View> : null}
    </CardSurface>
  );

  if (centered) {
    return <View style={styles.emptyCenteredWrap}>{card}</View>;
  }

  return card;
}

export function NoticeBanner({
  variant = 'warning',
  title,
  description,
  children,
  testID,
}: {
  variant?: 'warning' | 'destructive' | 'info';
  title?: string;
  description: string;
  children?: React.ReactNode;
  testID?: string;
}) {
  const { palette } = useTheme();
  const { textAlign } = useDirection();
  const colorMap = {
    warning: { bg: palette.warningSoft, text: palette.warning, border: palette.warning },
    destructive: { bg: palette.destructiveSoft, text: palette.destructive, border: palette.destructive },
    info: { bg: 'rgba(59, 130, 196, 0.12)', text: palette.primary, border: palette.primary },
  }[variant];

  return (
    <View
      testID={testID}
      style={[
        styles.notice,
        { backgroundColor: colorMap.bg, borderColor: colorMap.border },
      ]}
    >
      {title ? (
        <Text style={[styles.noticeTitle, { color: colorMap.text, textAlign }]}>
          {title}
        </Text>
      ) : null}
      <Text style={[styles.noticeDesc, { color: colorMap.text, textAlign }]}>
        {description}
      </Text>
      {children ? <View style={{ marginTop: 6 }}>{children}</View> : null}
    </View>
  );
}

export function SectionDateHeader({ title }: { title: string }) {
  const { palette } = useTheme();
  const { textAlign } = useDirection();
  return (
    <View style={styles.dateHeader}>
      <Text style={[styles.dateHeaderText, { color: palette.mutedForeground, textAlign }]}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardSurface: {
    borderRadius: 16,
    borderWidth: 1,
  },
  card: {
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitleGroup: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
  },
  cardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    ...heeboFont('700'),
  },
  cardDesc: {
    fontSize: 12,
    marginTop: 2,
    ...heeboFont('400'),
  },
  cardContent: {
    gap: 12,
  },
  infoBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  infoItem: {
    gap: 2,
  },
  infoLabel: {
    fontSize: 11,
    ...heeboFont('600'),
  },
  infoValue: {
    fontSize: 13,
    ...heeboFont('600'),
  },
  emptyCenteredWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  emptyCard: {
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    ...heeboFont('700'),
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    ...heeboFont('400'),
    textAlign: 'center',
    lineHeight: 18,
  },
  notice: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  noticeTitle: {
    fontSize: 13,
    ...heeboFont('700'),
  },
  noticeDesc: {
    fontSize: 12,
    ...heeboFont('500'),
  },
  dateHeader: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  dateHeaderText: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.35,
    ...heeboFont('600'),
  },
});
