import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { AlertCircle, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { heeboFont } from '../../theme/typography';
import { useDirection } from '../../i18n';

export function CardSurface({
  children,
  style,
  testID,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { palette } = useTheme();
  return (
    <View
      testID={testID}
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
  divided = false,
  style,
  headerStyle,
  contentStyle,
  testID,
}: {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  divided?: boolean;
  style?: StyleProp<ViewStyle>;
  headerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { palette } = useTheme();
  const { flexRow, textAlign, isRTL } = useDirection();
  const { width } = useWindowDimensions();
  const isWide = width >= 640;
  const hasHeader = Boolean(title || Icon || action || description);

  const childArray = React.Children.toArray(children);

  return (
    <CardSurface testID={testID} style={[styles.sectionCard, style]}>
      {hasHeader && (
        <View
          style={[
            styles.cardHeader,
            {
              borderBottomColor: palette.borderSubtle,
              flexDirection: isWide ? flexRow : 'column',
              alignItems: isWide
                ? 'center'
                : isRTL
                ? 'flex-end'
                : 'flex-start',
              justifyContent: isWide ? 'space-between' : 'flex-start',
            },
            headerStyle,
          ]}
        >
          <View
            style={[
              styles.cardHeaderMain,
              {
                flex: isWide ? 1 : undefined,
                width: isWide ? undefined : '100%',
              },
            ]}
          >
            {(Icon || title) && (
              <View style={[styles.cardTitleRow, { flexDirection: flexRow }]}>
                {Icon ? <Icon size={20} color={palette.primary} /> : null}
                {title ? (
                  <Text
                    style={[
                      styles.cardTitle,
                      { color: palette.cardForeground, textAlign },
                    ]}
                  >
                    {title}
                  </Text>
                ) : null}
              </View>
            )}
            {description ? (
              <Text
                style={[
                  styles.cardDesc,
                  { color: palette.mutedForeground, textAlign },
                ]}
              >
                {description}
              </Text>
            ) : null}
          </View>
          {action ? <View style={styles.cardAction}>{action}</View> : null}
        </View>
      )}

      {childArray.length > 0 && (
        <View
          style={[
            styles.cardContent,
            divided && styles.cardContentDivided,
            contentStyle,
          ]}
        >
          {divided
            ? childArray.map((child, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && (
                    <View
                      style={[
                        styles.rowDivider,
                        { backgroundColor: palette.borderSubtle },
                      ]}
                    />
                  )}
                  {child}
                </React.Fragment>
              ))
            : children}
        </View>
      )}
    </CardSurface>
  );
}

export function InfoBox({
  children,
  columns = 1,
  style,
}: {
  children: React.ReactNode;
  columns?: 1 | 2;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  const { flexRow } = useDirection();
  const { width } = useWindowDimensions();
  const useTwoCols = columns === 2 && width >= 640;

  const childArray = React.Children.toArray(children);

  return (
    <View
      style={[
        styles.infoBox,
        {
          backgroundColor: palette.infoBoxBg,
          flexDirection: useTwoCols ? flexRow : 'column',
        },
        style,
      ]}
    >
      {useTwoCols
        ? childArray.map((child, index) => (
            <View key={index} style={{ flex: 1, minWidth: 0 }}>
              {child}
            </View>
          ))
        : children}
    </View>
  );
}

export function InfoItem({
  label,
  value,
  isLtr,
  valueStyle,
  style,
}: {
  label: string;
  value: string | null | undefined;
  isLtr?: boolean;
  valueStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  const { textAlign } = useDirection();
  return (
    <View style={[styles.infoItem, style]}>
      <Text
        numberOfLines={1}
        style={[styles.infoLabel, { color: palette.mutedForeground, textAlign }]}
      >
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={[
          styles.infoValue,
          {
            color: palette.foreground,
            textAlign,
            writingDirection: isLtr ? 'ltr' : undefined,
            fontVariant: isLtr ? ['tabular-nums'] : undefined,
          },
          valueStyle,
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
  variant = 'info',
  title,
  badge,
  description,
  icon = AlertCircle,
  children,
  testID,
  style,
}: {
  variant?: 'warning' | 'destructive' | 'info';
  title?: string;
  badge?: string;
  description: string;
  icon?: LucideIcon | null;
  children?: React.ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette, isDark } = useTheme();
  const { flexRow, textAlign } = useDirection();

  const variantMap = {
    info: {
      bg: isDark ? 'rgba(34, 43, 58, 0.60)' : 'rgba(238, 242, 247, 0.65)',
      border: palette.border,
      iconBg: isDark ? 'rgba(87, 158, 224, 0.16)' : 'rgba(59, 130, 196, 0.10)',
      iconColor: palette.primary,
      titleColor: palette.foreground,
      descColor: palette.mutedForeground,
    },
    warning: {
      bg: palette.amberSoft,
      border: 'rgba(212, 151, 59, 0.30)',
      iconBg: 'rgba(212, 151, 59, 0.16)',
      iconColor: palette.amber,
      titleColor: palette.foreground,
      descColor: palette.mutedForeground,
    },
    destructive: {
      bg: palette.destructiveSoft,
      border: 'rgba(239, 68, 68, 0.25)',
      iconBg: 'rgba(239, 68, 68, 0.15)',
      iconColor: palette.destructive,
      titleColor: palette.destructive,
      descColor: palette.destructive,
    },
  }[variant];

  const Icon = icon;

  return (
    <View
      testID={testID}
      style={[
        styles.notice,
        {
          flexDirection: flexRow,
          backgroundColor: variantMap.bg,
          borderColor: variantMap.border,
        },
        style,
      ]}
    >
      {Icon ? (
        <View style={[styles.noticeIconBox, { backgroundColor: variantMap.iconBg }]}>
          <Icon size={16} color={variantMap.iconColor} />
        </View>
      ) : null}

      <View style={styles.noticeBody}>
        {(title || badge) && (
          <View style={[styles.noticeTitleRow, { flexDirection: flexRow }]}>
            {title ? (
              <Text style={[styles.noticeTitle, { color: variantMap.titleColor, textAlign }]}>
                {title}
              </Text>
            ) : null}
            {badge ? (
              <View
                style={[
                  styles.noticeBadge,
                  {
                    backgroundColor: isDark
                      ? 'rgba(59, 130, 196, 0.25)'
                      : 'rgba(59, 130, 196, 0.15)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.noticeBadgeText,
                    { color: isDark ? '#AED4F8' : '#3B82C4' },
                  ]}
                >
                  {badge}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        <Text style={[styles.noticeDesc, { color: variantMap.descColor, textAlign }]}>
          {description}
        </Text>

        {children ? <View style={{ marginTop: 4 }}>{children}</View> : null}
      </View>
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
  sectionCard: {
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  cardHeaderMain: {
    gap: 4,
    minWidth: 0,
  },
  cardTitleRow: {
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    letterSpacing: -0.3,
    ...heeboFont('700'),
    flexShrink: 1,
  },
  cardDesc: {
    fontSize: 12,
    ...heeboFont('400'),
  },
  cardAction: {
    flexShrink: 0,
  },
  cardContent: {
    padding: 16,
    gap: 14,
  },
  cardContentDivided: {
    gap: 0,
  },
  rowDivider: {
    height: 1,
    width: '100%',
  },
  infoBox: {
    borderRadius: 12,
    borderWidth: 0,
    padding: 14,
    gap: 16,
  },
  infoItem: {
    gap: 4,
    minWidth: 0,
  },
  infoLabel: {
    fontSize: 12,
    ...heeboFont('400'),
  },
  infoValue: {
    fontSize: 14,
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
    padding: 16,
    alignItems: 'flex-start',
    gap: 12,
  },
  noticeIconBox: {
    padding: 6,
    borderRadius: 8,
    marginTop: 2,
    flexShrink: 0,
  },
  noticeBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  noticeTitleRow: {
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  noticeTitle: {
    fontSize: 12,
    ...heeboFont('600'),
  },
  noticeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  noticeBadgeText: {
    fontSize: 10,
    ...heeboFont('500'),
  },
  noticeDesc: {
    fontSize: 12,
    ...heeboFont('400'),
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
