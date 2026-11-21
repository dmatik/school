import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  TextInput,
  Pressable,
  Switch,
  Modal,
  ScrollView,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { Search, X, ChevronDown, Check, type LucideIcon } from 'lucide-react-native';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';
import { heeboFont } from '../../theme/typography';
import { useDirection } from '../../i18n';
import { CHILD_COLOR_TOKENS } from '../../lib/colors';
import { useScrollHeader } from './MobileHeader';
import { GlassBackdrop } from './GlassBackdrop';

export function FieldLabel({
  label,
  description,
}: {
  label: string;
  description?: string;
}) {
  const { palette } = useTheme();
  const { textAlign } = useDirection();
  return (
    <View style={{ gap: 2 }}>
      <Text style={[styles.label, { color: palette.foreground, textAlign }]}>
        {label}
      </Text>
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
  ...props
}: TextInputProps & { forceLtr?: boolean }) {
  const { palette } = useTheme();
  const { textAlign } = useDirection();
  return (
    <TextInput
      placeholderTextColor={palette.mutedForeground}
      {...props}
      style={[
        styles.filledInput,
        {
          backgroundColor: palette.inputBg,
          borderColor: palette.border,
          color: palette.foreground,
          textAlign: forceLtr ? 'left' : textAlign,
        },
        style,
      ]}
    />
  );
}

export function IconInput({
  icon: Icon,
  forceLtr,
  style,
  ...props
}: TextInputProps & { icon: LucideIcon; forceLtr?: boolean }) {
  const { palette } = useTheme();
  const { flexRow, textAlign } = useDirection();

  return (
    <View
      style={[
        styles.iconInputWrap,
        {
          flexDirection: forceLtr ? 'row' : flexRow,
          backgroundColor: palette.inputBg,
          borderColor: palette.border,
        },
      ]}
    >
      <Icon size={16} color={palette.mutedForeground} />
      <TextInput
        placeholderTextColor={palette.mutedForeground}
        {...props}
        style={[
          styles.iconInputField,
          {
            color: palette.foreground,
            textAlign: forceLtr ? 'left' : textAlign,
          },
          style,
        ]}
      />
    </View>
  );
}

export function SearchInput({
  value,
  onChangeText,
  placeholder,
  testID,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  testID?: string;
}) {
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
  testID,
}: {
  label?: string;
  description?: string;
  value: string;
  options: SelectOption[];
  onValueChange: (val: string) => void;
  placeholder?: string;
  testID?: string;
}) {
  const { palette } = useTheme();
  const { flexRow, textAlign } = useDirection();
  const [open, setOpen] = useState(false);

  const selectedLabel =
    options.find((o) => o.value === value)?.label || placeholder || value;

  return (
    <View style={{ gap: 6 }}>
      {label ? <FieldLabel label={label} description={description} /> : null}
      <Pressable
        testID={testID}
        onPress={() => setOpen(true)}
        style={[
          styles.selectTrigger,
          {
            flexDirection: flexRow,
            backgroundColor: palette.inputBg,
            borderColor: palette.border,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 14, color: palette.foreground, textAlign }}
        >
          {selectedLabel}
        </Text>
        <ChevronDown size={16} color={palette.mutedForeground} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.selectBackdrop} onPress={() => setOpen(false)}>
          <View
            style={[
              styles.selectSheet,
              { backgroundColor: palette.card, borderColor: palette.border },
            ]}
          >
            <ScrollView style={{ maxHeight: 300 }}>
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      onValueChange(opt.value);
                      setOpen(false);
                    }}
                    style={[
                      styles.selectOption,
                      {
                        flexDirection: flexRow,
                        backgroundColor: isSelected ? palette.muted : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        heeboFont(isSelected ? '700' : '500'),
                        {
                          flex: 1,
                          fontSize: 14,
                          color: palette.foreground,
                          textAlign,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && <Check size={16} color={palette.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export function SwitchField({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
}) {
  const { palette } = useTheme();
  const { flexRow } = useDirection();

  return (
    <View style={[styles.switchRow, { flexDirection: flexRow }]}>
      <View style={{ flex: 1 }}>
        <FieldLabel label={label} description={description} />
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: palette.border, true: palette.primary }}
      />
    </View>
  );
}

export function ColorSwatchPicker({
  selectedColorId,
  onSelectColor,
}: {
  selectedColorId?: string | null;
  onSelectColor: (colorId: string | null) => void;
}) {
  const { palette } = useTheme();
  const { flexRow } = useDirection();

  return (
    <View style={[styles.swatchRow, { flexDirection: flexRow }]}>
      {CHILD_COLOR_TOKENS.map((c) => {
        const selected = selectedColorId === c.id;
        return (
          <Pressable
            key={c.id}
            onPress={() => onSelectColor(c.id)}
            style={[
              styles.swatch,
              {
                backgroundColor: c.solidBg,
                borderColor: selected ? palette.foreground : 'transparent',
                borderWidth: selected ? 2 : 0,
              },
            ]}
          >
            {selected && <Check size={12} color="#ffffff" />}
          </Pressable>
        );
      })}
      <Pressable
        onPress={() => onSelectColor(null)}
        style={[
          styles.swatch,
          {
            backgroundColor: palette.muted,
            borderColor: !selectedColorId ? palette.foreground : palette.border,
            borderWidth: 1,
          },
        ]}
      >
        <X size={12} color={palette.mutedForeground} />
      </Pressable>
    </View>
  );
}

export function StickyFilterBar({
  children,
}: {
  children: React.ReactNode;
}) {
  const { headerHeight, scrollY } = useScrollHeader();
  const [naturalY, setNaturalY] = useState<number | null>(null);

  const stickyTop = headerHeight + 8;
  const threshold = naturalY !== null ? Math.max(0, naturalY - stickyTop) : 52;

  const translateY = scrollY.interpolate({
    inputRange: [0, threshold, threshold + 10000],
    outputRange: [0, 0, 10000],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      onLayout={(e) => {
        const y = e.nativeEvent.layout.y;
        if (y > 0 && y !== naturalY) {
          setNaturalY(y);
        }
      }}
      style={[
        styles.stickyFilterBar,
        { transform: [{ translateY }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

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
  const flatPillBg = isDark ? 'rgba(6, 10, 18, 0.55)' : 'rgba(15, 23, 42, 0.08)';

  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView> | null>(null);
  const viewportWidth = useRef(0);
  const scrollOffset = useRef(0);
  const [hasMeasured, setHasMeasured] = useState(false);
  const pillX = useSharedValue(0);
  const pillW = useSharedValue(0);
  const tabsKey = tabs.map((t) => `${t.value}:${t.label}`).join('|');

  useEffect(() => {
    const layout = tabLayouts.current[value];
    if (!layout) return;

    const springConfig = {
      stiffness: 450,
      damping: 35,
      mass: 1,
    };
    pillX.value = withSpring(layout.x, springConfig);
    pillW.value = withSpring(layout.width, springConfig);

    // Ensure selected pill is always fully visible inside the scrollable filter bar
    if (scrollRef.current && viewportWidth.current > 0) {
      const leftEdge = layout.x;
      const rightEdge = layout.x + layout.width;
      const currentLeft = scrollOffset.current;
      const currentRight = currentLeft + viewportWidth.current;

      if (leftEdge < currentLeft) {
        const nextX = Math.max(0, leftEdge - 4);
        scrollRef.current.scrollTo({ x: nextX, animated: true });
        scrollOffset.current = nextX;
      } else if (rightEdge > currentRight) {
        const nextX = rightEdge - viewportWidth.current + 4;
        scrollRef.current.scrollTo({ x: nextX, animated: true });
        scrollOffset.current = nextX;
      }
    }
  }, [value, hasMeasured, tabsKey, pillX, pillW]);

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    left: pillX.value,
    width: pillW.value,
  }));

  const alignStart = isRTL ? ('flex-end' as const) : ('flex-start' as const);

  return (
    <View style={[styles.tabsOuter, { alignSelf: alignStart }]}>
      <View
        style={[
          styles.tabsShell,
          {
            alignSelf: alignStart,
          },
        ]}
      >
        <GlassBackdrop />
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          testID={testID}
          style={styles.tabsScroll}
          onLayout={(e) => {
            viewportWidth.current = e.nativeEvent.layout.width;
          }}
          onScroll={(e) => {
            scrollOffset.current = e.nativeEvent.contentOffset.x;
          }}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.tabsContainer, { flexDirection: flexRow }]}
        >
          {hasMeasured && (
            <Reanimated.View
              pointerEvents="none"
              style={[styles.tabSlidingPillWrap, pillAnimatedStyle]}
            >
              <View style={[styles.tabSlidingPill, { backgroundColor: flatPillBg }]} />
            </Reanimated.View>
          )}

          {tabs.map((tab) => {
            const active = tab.value === value;
            return (
              <Pressable
                key={tab.value}
                onPress={() => onChange(tab.value)}
                onLayout={(e) => {
                  const { x, width } = e.nativeEvent.layout;
                  const prev = tabLayouts.current[tab.value];
                  const changed = !prev || prev.x !== x || prev.width !== width;
                  tabLayouts.current[tab.value] = { x, width };
                  if (tab.value === value && (!hasMeasured || changed)) {
                    pillX.value = x;
                    pillW.value = width;
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
  label: {
    fontSize: 12,
    ...heeboFont('600'),
  },
  labelDesc: {
    fontSize: 11,
    ...heeboFont('400'),
  },
  filledInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    ...heeboFont('400'),
  },
  iconInputWrap: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 10,
  },
  iconInputField: {
    flex: 1,
    fontSize: 14,
    height: '100%',
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
  selectTrigger: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  selectBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  selectSheet: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: 6,
  },
  selectOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  switchRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  swatchRow: {
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsOuter: {
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: '100%',
  },
  stickyFilterBar: {
    zIndex: 15,
    gap: 8,
  },
  tabsShell: {
    height: 40,
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
    padding: 4,
    gap: 0,
    alignItems: 'center',
    position: 'relative',
  },
  tabSlidingPillWrap: {
    position: 'absolute',
    top: 4,
    bottom: 4,
  },
  tabSlidingPill: {
    flex: 1,
    borderRadius: 999,
  },
  tabItem: {
    height: 32,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
