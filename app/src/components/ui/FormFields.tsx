import React, {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Platform,
  View,
  Text,
  TextInput,
  Pressable,
  Switch,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Search, X, ChevronDown, Check, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { heeboFont } from '../../theme/typography';
import { useDirection } from '../../i18n';
import { ModalLayer } from './ModalPortal';
import { CHILD_COLOR_TOKENS } from '../../lib/colors';
import {
  AndroidBlurTarget,
  type AndroidBlurTargetRef,
} from './GlassBackdrop';
import { SlidingPill } from './SlidingPill';

export function FieldLabel({
  label,
  description,
  style,
}: {
  label?: string;
  description?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  const { textAlign } = useDirection();
  return (
    <View style={[{ gap: 2 }, style]}>
      {label ? (
        <Text style={[styles.label, { color: palette.foreground, textAlign }]}>
          {label}
        </Text>
      ) : null}
      {description ? (
        <Text style={[styles.labelDesc, { color: palette.mutedForeground, textAlign }]}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

export function FilledInput({
  style,
  forceLtr,
  variant = 'filled',
  multiline,
  editable = true,
  ...props
}: TextInputProps & {
  forceLtr?: boolean;
  variant?: 'filled' | 'card';
}) {
  const { palette } = useTheme();
  const { textAlign, writingDirection } = useDirection();
  const bg = variant === 'card' ? palette.card : palette.inputBg;
  const isMultiline = Boolean(multiline);

  return (
    <TextInput
      placeholderTextColor={palette.mutedForeground}
      multiline={isMultiline}
      editable={editable}
      {...props}
      style={[
        isMultiline ? styles.filledTextarea : styles.filledInput,
        {
          backgroundColor: bg,
          color: palette.foreground,
          textAlign: forceLtr ? 'left' : textAlign,
          writingDirection: forceLtr ? 'ltr' : writingDirection,
          opacity: editable === false ? 0.5 : 1,
        },
        style,
      ]}
    />
  );
}

export function FilledTextarea({
  style,
  forceLtr,
  variant = 'filled',
  editable = true,
  ...props
}: TextInputProps & {
  forceLtr?: boolean;
  variant?: 'filled' | 'card';
}) {
  return (
    <FilledInput
      multiline
      textAlignVertical="top"
      variant={variant}
      forceLtr={forceLtr}
      editable={editable}
      style={style}
      {...props}
    />
  );
}

export function IconInput({
  icon: Icon,
  forceLtr,
  variant = 'filled',
  editable = true,
  wrapperStyle,
  style,
  ...props
}: TextInputProps & {
  icon: LucideIcon;
  forceLtr?: boolean;
  variant?: 'filled' | 'card';
  wrapperStyle?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  const { flexRow, textAlign } = useDirection();
  const bg = variant === 'card' ? palette.card : palette.inputBg;

  return (
    <View
      style={[
        styles.iconInputWrap,
        {
          flexDirection: forceLtr ? 'row' : flexRow,
          backgroundColor: bg,
          opacity: editable === false ? 0.5 : 1,
        },
        wrapperStyle,
      ]}
    >
      <Icon size={16} color={palette.mutedForeground} />
      <TextInput
        placeholderTextColor={palette.mutedForeground}
        editable={editable}
        {...props}
        style={[
          styles.iconInputField,
          {
            color: palette.foreground,
            textAlign: forceLtr ? 'left' : textAlign,
            writingDirection: forceLtr ? 'ltr' : undefined,
          },
          style,
        ]}
      />
    </View>
  );
}

export function CounterField({
  label,
  currentLength,
  maxLength,
  children,
  style,
}: {
  label: string;
  currentLength: number;
  maxLength: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  const { flexRow } = useDirection();

  return (
    <View style={[{ gap: 8 }, style]}>
      <View
        style={[
          styles.counterHeader,
          { flexDirection: flexRow },
        ]}
      >
        <FieldLabel label={label} />
        <Text
          style={[
            styles.counterValue,
            { color: palette.mutedForeground },
          ]}
        >
          {`${currentLength}/${maxLength}`}
        </Text>
      </View>
      {children}
    </View>
  );
}

export function ReadOnlyPillField({
  label,
  value,
  icon: Icon,
  style,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  const { flexRow, textAlign } = useDirection();

  return (
    <View style={[{ gap: 6 }, style]}>
      <Text style={[styles.readOnlyLabel, { color: palette.mutedForeground, textAlign }]}>
        {label}
      </Text>
      <View
        style={[
          styles.readOnlyPill,
          {
            flexDirection: flexRow,
            backgroundColor: palette.infoBoxBg,
          },
        ]}
      >
        {Icon ? <Icon size={16} color={palette.primary} /> : null}
        <Text
          numberOfLines={1}
          style={[styles.readOnlyValue, { color: palette.foreground, textAlign }]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const DEFAULT_TIME_PRESETS = ['11:45', '12:45', '13:30', '14:15', '15:00', '16:00'];

export function TimePresetInput({
  label,
  value,
  onChange,
  presets = DEFAULT_TIME_PRESETS,
  presetsLabel,
  disabled = false,
  style,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  presets?: string[];
  presetsLabel?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  const { flexRow, textAlign } = useDirection();

  const handleInputChange = (raw: string) => {
    if (raw.length < value.length && value.startsWith(raw)) {
      onChange(raw.endsWith(':') ? raw.slice(0, -1) : raw);
      return;
    }
    if (/^\d:$/.test(raw)) {
      onChange(`0${raw}`);
      return;
    }
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) {
      onChange(digits);
    } else {
      onChange(`${digits.slice(0, 2)}:${digits.slice(2)}`);
    }
  };

  const rows: string[][] = [];
  for (let i = 0; i < presets.length; i += 3) {
    rows.push(presets.slice(i, i + 3));
  }

  return (
    <View style={[{ gap: 12 }, style]}>
      <View style={{ gap: 8 }}>
        {label ? <FieldLabel label={label} /> : null}
        <FilledInput
          forceLtr
          keyboardType="number-pad"
          placeholder="13:30"
          maxLength={5}
          value={value}
          onChangeText={handleInputChange}
          editable={!disabled}
          style={styles.timeInputText}
        />
      </View>

      {presets.length > 0 && (
        <View style={{ gap: 6 }}>
          {presetsLabel ? (
            <Text style={[styles.presetsLabel, { color: palette.mutedForeground, textAlign }]}>
              {presetsLabel}
            </Text>
          ) : null}
          <View style={{ gap: 6 }}>
            {rows.map((row, rowIdx) => (
              <View key={rowIdx} style={[styles.presetsRow, { flexDirection: flexRow }]}>
                {row.map((preset) => {
                  const active = value === preset;
                  return (
                    <Pressable
                      key={preset}
                      disabled={disabled}
                      onPress={() => onChange(preset)}
                      style={({ pressed }) => [
                        styles.presetPill,
                        {
                          backgroundColor: active ? palette.primary : palette.card,
                          borderColor: active ? palette.primary : palette.border,
                          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.presetPillText,
                          {
                            color: active
                              ? palette.primaryForeground
                              : palette.foreground,
                          },
                        ]}
                      >
                        {preset}
                      </Text>
                    </Pressable>
                  );
                })}
                {row.length < 3
                  ? Array.from({ length: 3 - row.length }).map((_, emptyIdx) => (
                      <View key={`empty-${emptyIdx}`} style={{ flex: 1 }} />
                    ))
                  : null}
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

export function SearchInput({
  value,
  onChangeText,
  placeholder,
  testID,
  style,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const { palette, isDark } = useTheme();
  const { flexRow, textAlign } = useDirection();
  const searchBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

  return (
    <View
      style={[
        styles.searchWrap,
        {
          flexDirection: flexRow,
          backgroundColor: searchBg,
        },
        style,
      ]}
    >
      <Search size={20} color={palette.mutedForeground} />
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.mutedForeground}
        style={[styles.searchField, { color: palette.foreground, textAlign }]}
      />
      {value.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.clear_search')}
          onPress={() => onChangeText('')}
          hitSlop={8}
          style={styles.searchClearBtn}
        >
          <X size={16} strokeWidth={2.5} color={palette.mutedForeground} />
        </Pressable>
      )}
    </View>
  );
}

export interface SelectOption {
  label: string;
  value: string;
}

export function SelectField({
  label,
  description,
  value,
  options,
  onValueChange,
  placeholder,
  variant = 'filled',
  layout = 'stacked',
  disabled = false,
  testID,
  style,
}: {
  label?: string;
  description?: string;
  value: string;
  options: SelectOption[];
  onValueChange: (val: string) => void;
  placeholder?: string;
  variant?: 'filled' | 'card';
  layout?: 'stacked' | 'responsive';
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  const { flexRow, textAlign } = useDirection();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);

  const hasHeader = Boolean(label || description);
  const isWide = width >= 640;
  const isResponsiveWide = layout === 'responsive' && hasHeader && isWide;
  const isResponsiveRow = layout === 'responsive' && hasHeader;

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption?.label || placeholder || value;
  const triggerBg = variant === 'card' ? palette.card : palette.inputBg;

  const triggerNode = (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label || displayLabel}
      disabled={disabled}
      onPress={() => setOpen(true)}
      style={({ pressed }) => [
        styles.selectTrigger,
        {
          flexDirection: flexRow,
          backgroundColor: triggerBg,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.selectTriggerText,
          {
            color: selectedOption ? palette.foreground : palette.mutedForeground,
            textAlign,
          },
        ]}
      >
        {displayLabel}
      </Text>
      <ChevronDown
        size={16}
        color={palette.mutedForeground}
        style={{ opacity: 0.5 }}
      />
    </Pressable>
  );

  return (
    <View
      style={[
        isResponsiveRow
          ? isResponsiveWide
            ? [styles.selectResponsiveWideRow, { flexDirection: flexRow }]
            : styles.selectResponsiveStackedRow
          : styles.selectStackedContainer,
        style,
      ]}
    >
      {hasHeader ? (
        <View style={isResponsiveWide ? { flex: 1, minWidth: 0 } : undefined}>
          <FieldLabel label={label} description={description} />
        </View>
      ) : null}

      <View style={isResponsiveWide ? { width: 160, flexShrink: 0 } : styles.fullWidth}>
        {triggerNode}
      </View>

      <ModalLayer
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.selectBackdrop}>
          <Pressable
            accessible={false}
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
          />
          <View
            style={[
              styles.selectSheet,
              {
                backgroundColor: palette.popover,
                borderColor: palette.border,
              },
            ]}
          >
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <Pressable
                    key={opt.value}
                    accessibilityRole="button"
                    accessibilityLabel={opt.label}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      onValueChange(opt.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.selectOption,
                      {
                        flexDirection: flexRow,
                        backgroundColor:
                          isSelected || pressed ? palette.accent : 'transparent',
                      },
                    ]}
                  >
                    <View style={styles.selectCheckSlot}>
                      {isSelected ? (
                        <Check size={16} color={palette.foreground} />
                      ) : null}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        heeboFont(isSelected ? '600' : '400'),
                        styles.selectOptionText,
                        {
                          color: palette.foreground,
                          textAlign,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </ModalLayer>
    </View>
  );
}

export function SwitchField({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  style,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  const { flexRow } = useDirection();

  return (
    <View style={[styles.switchRow, { flexDirection: flexRow }, style]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <FieldLabel label={label} description={description} />
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ false: palette.switchTrackOff, true: palette.primary }}
      />
    </View>
  );
}

export function ColorSwatchPicker({
  selectedColorId,
  onSelectColor,
  allowClear = true,
  clearPosition = 'end',
  swatchSize = 'default',
  disabled = false,
  style,
}: {
  selectedColorId?: string | null;
  onSelectColor: (colorId: string | null) => void;
  allowClear?: boolean;
  clearPosition?: 'start' | 'end';
  swatchSize?: 'sm' | 'default' | 'lg';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const { palette, isDark } = useTheme();
  const { flexRow } = useDirection();

  const diameter = swatchSize === 'sm' ? 20 : swatchSize === 'lg' ? 32 : 24;
  const iconSize = swatchSize === 'sm' ? 10 : swatchSize === 'lg' ? 16 : 12;

  const isDefaultActive = !selectedColorId;
  const clearButton = allowClear ? (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={t('account.color_default')}
      onPress={() => onSelectColor(null)}
      style={({ pressed }) => [
        styles.swatch,
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          borderWidth: 1,
          borderColor: isDefaultActive ? palette.primary : palette.border,
          backgroundColor: isDefaultActive
            ? isDark
              ? 'rgba(87, 158, 224, 0.16)'
              : 'rgba(59, 130, 196, 0.10)'
            : palette.infoBoxBg,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 1.08 : 1 }],
        },
      ]}
    >
      {isDefaultActive ? (
        <View
          pointerEvents="none"
          style={[
            styles.swatchOuterRing,
            {
              borderColor: isDark
                ? 'rgba(87, 158, 224, 0.35)'
                : 'rgba(59, 130, 196, 0.30)',
            },
          ]}
        />
      ) : null}
      <X
        size={iconSize}
        strokeWidth={2.5}
        color={isDefaultActive ? palette.primary : palette.mutedForeground}
      />
    </Pressable>
  ) : null;

  return (
    <View style={[styles.swatchRow, { flexDirection: flexRow }, style]}>
      {clearPosition === 'start' ? clearButton : null}

      {CHILD_COLOR_TOKENS.map((c) => {
        const selected = selectedColorId === c.id;
        return (
          <Pressable
            key={c.id}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={t(c.labelKey)}
            onPress={() => onSelectColor(c.id)}
            style={({ pressed }) => [
              styles.swatch,
              {
                width: diameter,
                height: diameter,
                borderRadius: diameter / 2,
                backgroundColor: c.solidBg,
                opacity: disabled ? 0.5 : selected ? 1 : 0.75,
                transform: [{ scale: selected || pressed ? 1.08 : 1 }],
              },
            ]}
          >
            {selected ? (
              <View
                pointerEvents="none"
                style={[
                  styles.swatchSelectedRing,
                  { borderColor: palette.foreground },
                ]}
              />
            ) : null}
          </Pressable>
        );
      })}

      {clearPosition === 'end' ? clearButton : null}
    </View>
  );
}

/**
 * On Android, wraps a screen's scrollable content in expo-blur's BlurTargetView
 * when a `blurTargetRef` is provided (e.g. for floating action buttons).
 * On iOS and web (or when no ref is provided), renders children directly.
 */
export function AndroidStickyBlurHost({
  children,
  blurTargetRef,
}: {
  children: React.ReactNode;
  blurTargetRef?: AndroidBlurTargetRef;
}) {
  if (Platform.OS === 'android' && blurTargetRef) {
    return (
      <AndroidBlurTarget targetRef={blurTargetRef} style={{ flex: 1 }}>
        {children}
      </AndroidBlurTarget>
    );
  }
  return <>{children}</>;
}

export function StickyFilterBar({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Retained for caller compatibility; filter bars now scroll with content on all platforms. */
  relativeToHeader?: boolean;
}) {
  return <View style={[styles.stickyFilterBar, style]}>{children}</View>;
}

const TAB_GAP = 8;

export function LiquidTabs({
  tabs,
  value,
  onChange,
  testID,
}: {
  tabs: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
  testID?: string;
}) {
  const { palette, isDark } = useTheme();
  const { isRTL, flexRow } = useDirection();

  const tabLayouts = useRef<Record<string, { x: number; width: number; height: number }>>({});
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView> | null>(null);
  const viewportWidth = useRef(0);
  const contentWidth = useRef(0);
  const scrollOffset = useRef(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const [hasMeasured, setHasMeasured] = useState(false);
  const [pillHeight, setPillHeight] = useState(32);
  const [visualValue, setVisualValue] = useState(value);
  const lastPressedRef = useRef<string | null>(null);
  const changeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pillState, setPillState] = useState({ x: 0, width: 0, animated: false });
  const tabsKey = tabs.map((t) => `${t.value}:${t.label}`).join('|');

  useEffect(() => {
    return () => {
      if (changeTimerRef.current) clearTimeout(changeTimerRef.current);
    };
  }, []);

  const updateScrollable = useCallback(() => {
    const canScroll =
      viewportWidth.current > 0 && contentWidth.current > viewportWidth.current + 1;
    setIsScrollable((prev) => (prev === canScroll ? prev : canScroll));
  }, []);

  const scrollToTab = useCallback((layout: { x: number; width: number }) => {
    if (!scrollRef.current || viewportWidth.current <= 0) return;
    const maxScroll = contentWidth.current - viewportWidth.current;
    if (maxScroll <= 1) return;

    const leftEdge = layout.x - TAB_GAP;
    const rightEdge = layout.x + layout.width + TAB_GAP;
    const currentLeft = scrollOffset.current;
    const currentRight = currentLeft + viewportWidth.current;

    let nextX: number | null = null;
    if (leftEdge < currentLeft - 1) {
      nextX = Math.max(0, leftEdge);
    } else if (rightEdge > currentRight + 1) {
      nextX = Math.min(maxScroll, rightEdge - viewportWidth.current);
    }

    if (nextX !== null && Math.abs(nextX - currentLeft) > 1) {
      scrollRef.current.scrollTo({ x: nextX, animated: true });
      scrollOffset.current = nextX;
    }
  }, []);

  useEffect(() => {
    setVisualValue(value);

    // If this change was already animated optimistically in handlePress, avoid re-triggering.
    if (lastPressedRef.current === value) {
      lastPressedRef.current = null;
      return;
    }
    lastPressedRef.current = null;

    const layout = tabLayouts.current[value];
    if (!layout) return;

    setPillState({ x: layout.x, width: layout.width, animated: hasMeasured });
    scrollToTab(layout);
  }, [value, hasMeasured, tabsKey, scrollToTab]);

  const handlePress = (val: string) => {
    const layout = tabLayouts.current[val];
    if (layout) {
      setPillState({ x: layout.x, width: layout.width, animated: true });
      scrollToTab(layout);
    }
    lastPressedRef.current = val;
    setVisualValue(val);

    if (process.env.JEST_WORKER_ID !== undefined) {
      onChange(val);
      return;
    }

    // Let the pill spring finish on an idle main thread before remounting the filtered card list.
    if (changeTimerRef.current) clearTimeout(changeTimerRef.current);
    changeTimerRef.current = setTimeout(() => {
      changeTimerRef.current = null;
      startTransition(() => {
        onChange(val);
      });
    }, 280);
  };

  const alignStart = isRTL ? ('flex-end' as const) : ('flex-start' as const);

  return (
    <View style={[styles.tabsOuter, { alignSelf: alignStart }]}>
      <View
        style={[
          styles.tabsShell,
          {
            alignSelf: alignStart,
            backgroundColor: palette.card,
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: 999,
              borderWidth: 1,
              borderColor: palette.glassBorder,
            },
          ]}
        />
        <ScrollView
          ref={scrollRef}
          horizontal
          scrollEnabled={isScrollable}
          bounces={false}
          showsHorizontalScrollIndicator={false}
          testID={testID}
          style={styles.tabsScroll}
          onLayout={(e) => {
            viewportWidth.current = e.nativeEvent.layout.width;
            updateScrollable();
          }}
          onContentSizeChange={(w) => {
            contentWidth.current = w;
            updateScrollable();
          }}
          onScroll={(e) => {
            scrollOffset.current = e.nativeEvent.contentOffset.x;
          }}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.tabsContainer, { flexDirection: flexRow }]}
        >
          {hasMeasured && pillHeight > 0 && (
            <SlidingPill
              x={pillState.x - TAB_GAP}
              width={pillState.width + TAB_GAP * 2}
              height={pillHeight}
              isDark={isDark}
              animated={pillState.animated}
              top={0}
            />
          )}

          {tabs.map((tab) => {
            const active = tab.value === visualValue;
            return (
              <Pressable
                key={tab.value}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: active }}
                onPress={() => handlePress(tab.value)}
                onLayout={(e) => {
                  const { x, width, height } = e.nativeEvent.layout;
                  const prev = tabLayouts.current[tab.value];
                  const changed = !prev || prev.x !== x || prev.width !== width;
                  tabLayouts.current[tab.value] = { x, width, height };
                  if (height > 0 && Math.abs(height - pillHeight) > 0.5) {
                    setPillHeight(height);
                  }
                  if (tab.value === visualValue && (!hasMeasured || changed)) {
                    setPillState({ x, width, animated: false });
                    if (!hasMeasured) setHasMeasured(true);
                  }
                }}
                style={styles.tabItem}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    {
                      fontSize: 16,
                      color: active ? palette.foreground : palette.mutedForeground,
                    },
                    heeboFont('500'),
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    ...heeboFont('600'),
  },
  labelDesc: {
    fontSize: 12,
    ...heeboFont('400'),
  },
  filledInput: {
    height: 40,
    borderRadius: 999,
    borderWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 0,
    fontSize: 14,
    ...heeboFont('400'),
  },
  filledTextarea: {
    minHeight: 72,
    borderRadius: 12,
    borderWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    ...heeboFont('400'),
  },
  iconInputWrap: {
    height: 40,
    borderRadius: 999,
    borderWidth: 0,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 10,
  },
  iconInputField: {
    flex: 1,
    fontSize: 14,
    ...heeboFont('400'),
    height: '100%',
    paddingVertical: 0,
  },
  counterHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  counterValue: {
    fontSize: 12,
    ...heeboFont('400'),
    fontVariant: ['tabular-nums'],
  },
  readOnlyLabel: {
    fontSize: 12,
    ...heeboFont('500'),
  },
  readOnlyPill: {
    height: 40,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 6,
  },
  readOnlyValue: {
    flexShrink: 1,
    fontSize: 14,
    ...heeboFont('600'),
  },
  timeInputText: {
    ...heeboFont('700'),
    fontVariant: ['tabular-nums'],
  },
  presetsLabel: {
    fontSize: 12,
    ...heeboFont('500'),
  },
  presetsRow: {
    gap: 6,
  },
  presetPill: {
    flex: 1,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetPillText: {
    fontSize: 12,
    ...heeboFont('600'),
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  searchWrap: {
    height: 44,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 10,
  },
  searchField: {
    flex: 1,
    fontSize: 17,
    ...heeboFont('400'),
    height: '100%',
  },
  searchClearBtn: {
    padding: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectStackedContainer: {
    gap: 8,
    width: '100%',
  },
  selectResponsiveStackedRow: {
    flexDirection: 'column',
    gap: 12,
    paddingVertical: 14,
    width: '100%',
  },
  selectResponsiveWideRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    width: '100%',
  },
  selectTrigger: {
    height: 40,
    borderRadius: 999,
    borderWidth: 0,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectTriggerText: {
    flex: 1,
    fontSize: 14,
    ...heeboFont('400'),
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  selectBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  selectSheet: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 6,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
  selectOption: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    gap: 8,
  },
  selectCheckSlot: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  selectOptionText: {
    flex: 1,
    fontSize: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  switchRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  swatchRow: {
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 5,
  },
  swatch: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelectedRing: {
    position: 'absolute',
    top: -4,
    right: -4,
    bottom: -4,
    left: -4,
    borderRadius: 999,
    borderWidth: 2,
  },
  swatchOuterRing: {
    position: 'absolute',
    top: -3,
    right: -3,
    bottom: -3,
    left: -3,
    borderRadius: 999,
    borderWidth: 2,
  },
  tabsOuter: {
    borderRadius: 999,
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: '100%',
  },
  stickyFilterBar: {
    zIndex: 15,
    gap: 8,
    marginBottom: 6,
  },
  tabsShell: {
    height: 40,
    padding: 4,
    borderRadius: 999,
    overflow: 'hidden',
    flexGrow: 0,
    flexShrink: 0,
  },
  tabsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  tabsContainer: {
    paddingHorizontal: TAB_GAP,
    gap: TAB_GAP,
    alignItems: 'center',
    position: 'relative',
  },
  tabItem: {
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
