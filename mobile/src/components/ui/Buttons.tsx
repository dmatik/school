import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import {
  RefreshCw,
  Check,
  Sun,
  Moon,
  Languages,
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useDirection, setAppLanguage } from '../../i18n';
import i18n from '../../i18n';

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  style,
  testID,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'destructive' | 'ghost';
  size?: 'sm' | 'md';
  loading?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const { palette } = useTheme();
  const { flexRow } = useDirection();

  const colors = {
    primary: {
      bg: palette.primary,
      border: palette.primary,
      text: palette.primaryForeground,
    },
    outline: {
      bg: 'transparent',
      border: palette.border,
      text: palette.foreground,
    },
    destructive: {
      bg: palette.destructive,
      border: palette.destructive,
      text: palette.destructiveForeground,
    },
    ghost: {
      bg: 'transparent',
      border: 'transparent',
      text: palette.mutedForeground,
    },
  }[variant];

  return (
    <Pressable
      testID={testID}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          flexDirection: flexRow,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          height: size === 'sm' ? 36 : 44,
          paddingHorizontal: size === 'sm' ? 14 : 18,
          opacity: disabled || loading ? 0.55 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 14 : 16} color={colors.text} />
      ) : null}
      <Text
        numberOfLines={1}
        style={[
          styles.buttonText,
          { color: colors.text, fontSize: size === 'sm' ? 12 : 14 },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function FloatingActionButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  testID,
  variant = 'primary',
}: {
  icon: LucideIcon;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
  variant?: 'primary' | 'success';
}) {
  const { palette } = useTheme();
  const { isRTL } = useDirection();

  return (
    <Pressable
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: variant === 'success' ? palette.success : palette.primary,
          left: isRTL ? 20 : undefined,
          right: isRTL ? undefined : 20,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Icon size={22} color="#ffffff" />
    </Pressable>
  );
}

export function SyncButton({
  syncing,
  success,
  onPress,
  label,
  testID,
}: {
  syncing: boolean;
  success?: boolean;
  onPress: () => void;
  label?: string;
  testID?: string;
}) {
  const { palette } = useTheme();
  const { flexRow } = useDirection();
  const isIconOnly = !label;

  return (
    <Pressable
      testID={testID}
      accessibilityLabel={label || 'Sync'}
      accessibilityRole="button"
      onPress={onPress}
      disabled={syncing}
      style={({ pressed }) => [
        isIconOnly ? styles.iconOnlySync : styles.iconPill,
        !isIconOnly && {
          flexDirection: flexRow,
          backgroundColor: palette.muted,
          borderColor: palette.border,
          paddingHorizontal: 12,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      {syncing ? (
        <ActivityIndicator size="small" color={palette.primary} />
      ) : success ? (
        <Check
          size={isIconOnly ? 22 : 16}
          strokeWidth={2.4}
          color={palette.success}
        />
      ) : (
        <RefreshCw
          size={isIconOnly ? 22 : 16}
          strokeWidth={2}
          color={palette.foreground}
        />
      )}
      {label ? (
        <Text style={{ fontSize: 12, fontWeight: '600', color: palette.foreground }}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function ModeToggleButton() {
  const { isDark, palette, setThemeMode } = useTheme();
  return (
    <Pressable
      accessibilityLabel="Toggle theme"
      onPress={() => setThemeMode(isDark ? 'light' : 'dark')}
      style={[
        styles.squareBtn,
        { backgroundColor: palette.card, borderColor: palette.border },
      ]}
    >
      {isDark ? (
        <Sun size={18} color={palette.foreground} />
      ) : (
        <Moon size={18} color={palette.foreground} />
      )}
    </Pressable>
  );
}

export function LanguageToggleButton() {
  const { palette } = useTheme();
  const isEn = (i18n.language || 'he').startsWith('en');
  return (
    <Pressable
      accessibilityLabel="Toggle language"
      onPress={() => setAppLanguage(isEn ? 'he' : 'en')}
      style={[
        styles.langBtn,
        { backgroundColor: palette.card, borderColor: palette.border },
      ]}
    >
      <Languages size={15} color={palette.foreground} />
      <Text style={{ fontSize: 12, fontWeight: '700', color: palette.foreground }}>
        {isEn ? 'עב' : 'EN'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 92,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
  },
  iconPill: {
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  iconOnlySync: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langBtn: {
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
});
