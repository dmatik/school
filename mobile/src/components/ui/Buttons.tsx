import React, { useEffect } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import Reanimated, {
  Easing,
  ZoomIn,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  RefreshCw,
  Check,
  Sun,
  Moon,
  Languages,
  type LucideIcon,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { heeboFont } from '../../theme/typography';
import { useDirection, setAppLanguage } from '../../i18n';
import i18n from '../../i18n';
import { GlassBackdrop } from './GlassBackdrop';

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

export function LiquidButton({
  label,
  icon: Icon,
  active = false,
  disabled = false,
  loading = false,
  onPress,
  style,
  testID,
  accessibilityLabel,
}: {
  label?: string;
  icon?: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const { palette, isDark } = useTheme();
  const { flexRow } = useDirection();
  const tintColor = active
    ? palette.foreground
    : isDark
      ? 'rgba(248, 250, 252, 0.85)'
      : palette.mutedForeground;

  return (
    <Pressable
      testID={testID}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.liquidShell,
        {
          flexDirection: flexRow,
          opacity: disabled || loading ? 0.5 : pressed ? 0.78 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      <GlassBackdrop />
      {loading ? (
        <ActivityIndicator size="small" color={tintColor} />
      ) : Icon ? (
        <Icon size={18} strokeWidth={1.85} color={tintColor} />
      ) : null}
      {label ? (
        <Text numberOfLines={1} style={[styles.liquidButtonText, { color: tintColor }]}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function FloatingActionButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  testID,
}: {
  icon: LucideIcon;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
  variant?: 'primary' | 'success';
}) {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const { isRTL } = useDirection();
  const bottomOffset = Math.max(insets.bottom - 10, 10) + 76;

  return (
    <Pressable
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          bottom: bottomOffset,
          left: isRTL ? 16 : undefined,
          right: isRTL ? undefined : 16,
          transform: [{ scale: pressed ? 0.92 : 1 }],
        },
      ]}
    >
      <GlassBackdrop />
      <Icon size={22} strokeWidth={2.2} color={palette.foreground} />
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
  const { palette, isDark } = useTheme();
  const { flexRow } = useDirection();
  const isIconOnly = !label;
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (syncing) {
      rotation.value = 0;
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(rotation);
      rotation.value = 0;
    }
  }, [syncing, rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const successIconColor = isDark ? '#34d399' : '#059669';
  const pillSuccessColor = isDark ? '#9EE8D8' : '#2CA58D';

  return (
    <Pressable
      testID={testID}
      accessibilityLabel={label || 'Sync'}
      accessibilityRole="button"
      onPress={onPress}
      disabled={syncing}
      style={({ pressed }) => [
        isIconOnly ? styles.iconOnlySync : styles.iconPill,
        isIconOnly && success && { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
        !isIconOnly && {
          flexDirection: flexRow,
          backgroundColor: success
            ? isDark
              ? 'rgba(44, 165, 141, 0.25)'
              : 'rgba(44, 165, 141, 0.15)'
            : palette.muted,
          borderColor: success ? 'rgba(44, 165, 141, 0.5)' : palette.border,
          paddingHorizontal: 12,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      {success ? (
        <Reanimated.View key="check" entering={ZoomIn.duration(150)}>
          <Check
            size={isIconOnly ? 22 : 16}
            strokeWidth={2.5}
            color={isIconOnly ? successIconColor : pillSuccessColor}
          />
        </Reanimated.View>
      ) : (
        <Reanimated.View key="refresh" style={spinStyle}>
          <RefreshCw
            size={isIconOnly ? 22 : 16}
            strokeWidth={2}
            color={palette.foreground}
          />
        </Reanimated.View>
      )}
      {label ? (
        <Text
          style={[
            heeboFont('600'),
            {
              fontSize: 12,
              color: success ? pillSuccessColor : palette.foreground,
            },
          ]}
        >
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
      <Text style={[heeboFont('700'), { fontSize: 12, color: palette.foreground }]}>
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
    ...heeboFont('600'),
  },
  liquidShell: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexGrow: 0,
    flexShrink: 0,
  },
  liquidButtonText: {
    fontSize: 16,
    ...heeboFont('500'),
  },
  fab: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
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
