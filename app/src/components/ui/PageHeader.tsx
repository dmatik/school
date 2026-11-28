import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { heeboFont } from '../../theme/typography';
import { useDirection } from '../../i18n';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

export function PageHeader({
  title,
  description,
  actions,
  border = true,
  style,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  border?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  const { flexRow, textAlign } = useDirection();
  const { isDesktop, pageMaxWidth } = useResponsiveLayout();

  if (!isDesktop) {
    return null;
  }

  return (
    <View
      style={[
        styles.outer,
        { backgroundColor: palette.background },
      ]}
    >
      <View
        testID="desktop-page-header"
        style={[
          styles.container,
          {
            maxWidth: pageMaxWidth,
            flexDirection: flexRow,
            borderBottomWidth: border ? 1 : 0,
            borderBottomColor: palette.borderSubtle,
          },
          style,
        ]}
      >
      <View style={styles.textWrap}>
        <Text
          numberOfLines={1}
          style={[styles.title, { color: palette.foreground, textAlign }]}
        >
          {title}
        </Text>
        {description ? (
          <Text
            numberOfLines={1}
            style={[styles.description, { color: palette.mutedForeground, textAlign }]}
          >
            {description}
          </Text>
        ) : null}
      </View>

      {actions ? (
        <View style={[styles.actions, { flexDirection: flexRow }]}>{actions}</View>
      ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    paddingHorizontal: 24,
    zIndex: 30,
  },
  container: {
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 24,
    paddingBottom: 10,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
    minHeight: 36,
    justifyContent: 'center',
    gap: 2,
  },
  title: {
    fontSize: 20,
    letterSpacing: -0.3,
    ...heeboFont('700'),
  },
  description: {
    fontSize: 12,
    ...heeboFont('400'),
  },
  actions: {
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
});
