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
import { useTheme } from '../../theme/ThemeContext';
import { useDirection } from '../../i18n';
import { CHILD_COLOR_TOKENS } from '../../lib/colors';
import { LiquidGlassContainer, LiquidGlassSurface } from './LiquidGlassSurface';

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
  const { palette } = useTheme();
  const { flexRow, textAlign } = useDirection();

  return (
    <View
      style={[
        styles.searchWrap,
        {
          flexDirection: flexRow,
          backgroundColor: palette.card,
          borderColor: palette.border,
        },
      ]}
    >
      <Search size={16} color={palette.mutedForeground} />
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.mutedForeground}
        style={[styles.searchField, { color: palette.foreground, textAlign }]}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <X size={16} color={palette.mutedForeground} />
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
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontWeight: isSelected ? '700' : '500',
                        color: palette.foreground,
                        textAlign,
                      }}
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
  const { palette, themeMode, isDark } = useTheme();
  const { flexRow } = useDirection();
  const flatPillBg = isDark ? 'rgba(6, 10, 18, 0.55)' : 'rgba(15, 23, 42, 0.08)';

  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const [hasMeasured, setHasMeasured] = useState(false);
  const pillX = useRef(new Animated.Value(0)).current;
  const pillW = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const layout = tabLayouts.current[value];
    if (!layout) return;

    Animated.parallel([
      Animated.spring(pillX, {
        toValue: layout.x,
        stiffness: 420,
        damping: 32,
        mass: 0.9,
        useNativeDriver: false,
      }),
      Animated.spring(pillW, {
        toValue: layout.width,
        stiffness: 420,
        damping: 32,
        mass: 0.9,
        useNativeDriver: false,
      }),
    ]).start();
  }, [value, hasMeasured, pillX, pillW]);

  return (
    <LiquidGlassContainer spacing={6} style={styles.tabsOuter}>
      <LiquidGlassSurface
        effect="regular"
        colorScheme={themeMode}
        style={styles.tabsShell}
        fallbackStyle={{
          backgroundColor: palette.muted,
          borderColor: palette.border,
          borderWidth: 1,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          testID={testID}
          style={styles.tabsScroll}
          contentContainerStyle={[styles.tabsContainer, { flexDirection: flexRow }]}
        >
          {hasMeasured && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.tabSlidingPillWrap,
                {
                  left: pillX,
                  width: pillW,
                },
              ]}
            >
              <View style={[styles.tabSlidingPill, { backgroundColor: flatPillBg }]} />
            </Animated.View>
          )}

          {tabs.map((tab) => {
            const active = tab.value === value;
            return (
              <Pressable
                key={tab.value}
                onPress={() => onChange(tab.value)}
                onLayout={(e) => {
                  const { x, width } = e.nativeEvent.layout;
                  tabLayouts.current[tab.value] = { x, width };
                  if (tab.value === value && !hasMeasured) {
                    pillX.setValue(x);
                    pillW.setValue(width);
                    setHasMeasured(true);
                  }
                }}
                style={styles.tabItem}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 12,
                    fontWeight: active ? '700' : '500',
                    color: active ? palette.foreground : palette.mutedForeground,
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </LiquidGlassSurface>
    </LiquidGlassContainer>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelDesc: {
    fontSize: 11,
  },
  filledInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
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
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  searchField: {
    flex: 1,
    fontSize: 14,
    height: '100%',
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
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  tabsShell: {
    borderRadius: 999,
    alignSelf: 'flex-start',
    overflow: 'hidden',
    flexGrow: 0,
    flexShrink: 0,
  },
  tabsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  tabsContainer: {
    padding: 2,
    gap: 4,
    alignItems: 'center',
    position: 'relative',
  },
  tabSlidingPillWrap: {
    position: 'absolute',
    top: 2,
    bottom: 2,
  },
  tabSlidingPill: {
    flex: 1,
    borderRadius: 999,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
  },
});
