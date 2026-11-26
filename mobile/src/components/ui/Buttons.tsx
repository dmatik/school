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
  Pencil,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { heeboFont } from '../../theme/typography';
import { useDirection, setAppLanguage } from '../../i18n';
import { GlassBackdrop, getGlassShadow } from './GlassBackdrop';
import { getDockBottomMargin } from './LiquidDock';

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'start',
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
  iconPosition?: 'start' | 'end';
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
      bg: palette.card,
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

  const iconEl = loading ? (
    <ActivityIndicator size="small" color={colors.text} />
  ) : Icon ? (
    <Icon size={size === 'sm' ? 14 : 16} color={colors.text} />
  ) : null;

  const textEl = (
    <Text
      numberOfLines={1}
      style={[
        styles.buttonText,
        { color: colors.text, fontSize: size === 'sm' ? 12 : 14 },
      ]}
    >
      {label}
    </Text>
  );

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
          height: size === 'sm' ? 34 : 40,
          paddingHorizontal: size === 'sm' ? 14 : 20,
          gap: size === 'sm' ? 6 : 8,
          opacity: disabled || loading ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {iconPosition === 'start' ? (
        <>
          {iconEl}
          {textEl}
        </>
      ) : (
        <>
          {textEl}
          {iconEl}
        </>
      )}
    </Pressable>
  );
}

export type ActionButtonVariant = 'ghost' | 'muted' | 'destructive' | 'outline' | 'default';

export function ActionButton({
  label,
  children,
  icon: Icon,
  iconPosition = 'end',
  variant = 'muted',
  size = 'sm',
  disabled = false,
  onPress,
  style,
  testID,
  accessibilityLabel,
}: {
  label?: string;
  children?: string;
  icon?: LucideIcon;
  iconPosition?: 'start' | 'end';
  variant?: ActionButtonVariant;
  size?: 'sm' | 'md';
  disabled?: boolean;
  onPress: () => void;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const { palette } = useTheme();
  const { flexRow } = useDirection();
  const displayLabel = label ?? children ?? '';

  const paletteByVariant = {
    muted: {
      bg: 'transparent',
      border: 'transparent',
      text: palette.mutedForeground,
    },
    destructive: {
      bg: 'transparent',
      border: 'transparent',
      text: palette.destructive,
    },
    outline: {
      bg: palette.card,
      border: palette.border,
      text: palette.foreground,
    },
    default: {
      bg: palette.primary,
      border: palette.primary,
      text: palette.primaryForeground,
    },
    ghost: {
      bg: 'transparent',
      border: 'transparent',
      text: palette.foreground,
    },
  }[variant];

  const iconEl = Icon ? <Icon size={14} color={paletteByVariant.text} /> : null;
  const textEl = displayLabel ? (
    <Text
      numberOfLines={1}
      style={[
        styles.actionButtonText,
        { color: paletteByVariant.text },
      ]}
    >
      {displayLabel}
    </Text>
  ) : null;

  return (
    <Pressable
      testID={testID}
      accessibilityLabel={accessibilityLabel || displayLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          flexDirection: flexRow,
          height: size === 'sm' ? 34 : 40,
          paddingHorizontal: size === 'sm' ? 12 : 16,
          backgroundColor: pressed && variant !== 'default' ? palette.accent : paletteByVariant.bg,
          borderColor: paletteByVariant.border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {iconPosition === 'start' ? (
        <>
          {iconEl}
          {textEl}
        </>
      ) : (
        <>
          {textEl}
          {iconEl}
        </>
      )}
    </Pressable>
  );
}

export function EditButton({
  label,
  children,
  icon = Pencil,
  ...props
}: Omit<React.ComponentProps<typeof ActionButton>, 'variant' | 'icon'> & {
  icon?: LucideIcon;
}) {
  const { t } = useTranslation();
  return (
    <ActionButton
      variant="muted"
      icon={icon}
      label={label ?? children ?? t('common.edit')}
      {...props}
    />
  );
}

export function DestructiveButton({
  icon = Trash2,
  ...props
}: Omit<React.ComponentProps<typeof ActionButton>, 'variant' | 'icon'> & {
  icon?: LucideIcon;
}) {
  return <ActionButton variant="destructive" icon={icon} {...props} />;
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
        getGlassShadow(isDark),
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

const FAB_SIZE = 50;
const FAB_DOCK_GAP = 78;
const FAB_CONTENT_CLEARANCE = 16;

/**
 * Returns the bottom scroll padding needed so the last item scrolls cleanly
 * above the FloatingActionButton (or above the dock when no FAB is visible).
 */
export function useFabScrollPadding(visible = true): number {
  const insets = useSafeAreaInsets();
  const baseBottom = getDockBottomMargin(insets.bottom);
  if (!visible) {
    return baseBottom + FAB_DOCK_GAP;
  }
  return baseBottom + FAB_DOCK_GAP + FAB_SIZE + FAB_CONTENT_CLEARANCE;
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
  const insets = useSafeAreaInsets();
  const { palette, isDark } = useTheme();
  const { isRTL } = useDirection();
  const bottomOffset = getDockBottomMargin(insets.bottom) + FAB_DOCK_GAP;
  const isSuccess = variant === 'success';

  return (
    <Pressable
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        getGlassShadow(isDark),
        {
          bottom: bottomOffset,
          left: isRTL ? 16 : undefined,
          right: isRTL ? undefined : 16,
          backgroundColor: isSuccess ? palette.tealSoft : undefined,
          borderColor: isSuccess ? palette.teal : undefined,
          transform: [{ scale: pressed ? 0.92 : 1 }],
        },
      ]}
    >
      <GlassBackdrop />
      <Icon
        size={22}
        strokeWidth={2.2}
        color={isSuccess ? palette.teal : palette.foreground}
      />
    </Pressable>
  );
}

export function SyncButton({
  syncing,
  success = false,
  onPress,
  variant,
  label,
  syncingLabel,
  successLabel,
  iconPosition = 'end',
  disabled = false,
  testID,
  style,
}: {
  syncing: boolean;
  success?: boolean;
  onPress: () => void;
  variant?: 'icon' | 'outline' | 'pill';
  label?: string;
  syncingLabel?: string;
  successLabel?: string;
  iconPosition?: 'start' | 'end';
  disabled?: boolean;
  testID?: string;
  style?: ViewStyle;
}) {
  const { t } = useTranslation();
  const { palette, isDark } = useTheme();
  const { flexRow } = useDirection();
  const resolvedVariant = variant ?? (label ? 'outline' : 'icon');
  const isPillMode = resolvedVariant === 'outline' || resolvedVariant === 'pill';
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

  if (isPillMode) {
    const displayLabel = success
      ? successLabel ?? t('account.webtop_synced')
      : syncing
      ? syncingLabel ?? t('account.webtop_syncing')
      : label ?? t('account.webtop_sync_button');

    const iconEl = success ? (
      <Reanimated.View key="check" entering={ZoomIn.duration(150)}>
        <Check size={14} strokeWidth={2.5} color={palette.teal} />
      </Reanimated.View>
    ) : (
      <Reanimated.View key="refresh" style={spinStyle}>
        <RefreshCw size={14} strokeWidth={2} color={palette.foreground} />
      </Reanimated.View>
    );

    const textEl = (
      <Text
        numberOfLines={1}
        style={[
          styles.pillSyncText,
          { color: success ? palette.teal : palette.foreground },
        ]}
      >
        {displayLabel}
      </Text>
    );

    return (
      <Pressable
        testID={testID}
        accessibilityLabel={displayLabel}
        accessibilityRole="button"
        onPress={onPress}
        disabled={disabled || syncing}
        style={({ pressed }) => [
          styles.iconPill,
          {
            flexDirection: flexRow,
            backgroundColor: success ? palette.tealSoft : palette.card,
            borderColor: success ? 'rgba(44, 165, 141, 0.5)' : palette.border,
            opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
          style,
        ]}
      >
        {iconPosition === 'start' ? (
          <>
            {iconEl}
            {textEl}
          </>
        ) : (
          <>
            {textEl}
            {iconEl}
          </>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityLabel={
        success
          ? t('common.sync_success')
          : syncing
          ? t('common.syncing')
          : t('common.sync_now')
      }
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || syncing}
      style={({ pressed }) => [
        styles.iconOnlySync,
        success && { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
        pressed && { opacity: 0.7 },
        style,
      ]}
    >
      {success ? (
        <Reanimated.View key="check" entering={ZoomIn.duration(150)}>
          <Check size={22} strokeWidth={2.5} color={successIconColor} />
        </Reanimated.View>
      ) : (
        <Reanimated.View key="refresh" style={spinStyle}>
          <RefreshCw size={22} strokeWidth={2} color={palette.foreground} />
        </Reanimated.View>
      )}
    </Pressable>
  );
}

export function ModeToggleButton() {
  const { t } = useTranslation();
  const { isDark, palette, setThemeMode } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.toggle_theme')}
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
  const { t, i18n: activeI18n } = useTranslation();
  const { palette } = useTheme();
  const isEn = (activeI18n.language || 'he').startsWith('en');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.toggle_language')}
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
  },
  buttonText: {
    ...heeboFont('600'),
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  actionButton: {
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 12,
    ...heeboFont('500'),
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  liquidShell: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
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
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  iconPill: {
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pillSyncText: {
    fontSize: 12,
    ...heeboFont('500'),
    includeFontPadding: false,
    textAlignVertical: 'center',
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
