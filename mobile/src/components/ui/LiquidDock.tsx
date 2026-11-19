import React, { useEffect, useId, useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import Svg, { Circle, Defs, Mask, Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useDirection } from '../../i18n';
import {
  LiquidGlassContainer,
  LiquidGlassSurface,
  isNativeLiquidGlassSupported,
} from './LiquidGlassSurface';

export interface DockTabItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

function SettingsActiveIcon({
  size,
  color,
  fill,
}: {
  size: number;
  color: string;
  fill: string;
}) {
  const maskId = useId();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <Mask id={maskId}>
          <Rect width="24" height="24" fill="white" />
          <Circle cx="12" cy="12" r="3" fill="black" />
        </Mask>
      </Defs>
      <Path
        d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"
        fill={fill}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        mask={`url(#${maskId})`}
      />
      <Circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LiquidDock({
  items,
  activeId,
  onSelect,
}: {
  items: DockTabItem[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { palette, themeMode, isDark } = useTheme();
  const { flexRow } = useDirection();
  const { width: screenWidth } = useWindowDimensions();
  const flatPillBg = isDark ? 'rgba(6, 10, 18, 0.55)' : 'rgba(15, 23, 42, 0.08)';
  const activeIconFill = isDark
    ? 'rgba(87, 158, 224, 0.26)'
    : 'rgba(59, 130, 196, 0.20)';

  const isScrollable = items.length > 5;
  const dockInnerWidth = Math.max(screenWidth - 48 - 8, 240);
  const itemWidth = isScrollable
    ? Math.floor(dockInnerWidth / 5)
    : Math.floor(dockInnerWidth / Math.max(items.length, 1));

  const scrollRef = useRef<React.ComponentRef<typeof ScrollView> | null>(null);
  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const [hasMeasured, setHasMeasured] = useState(false);
  const pillX = useRef(new Animated.Value(0)).current;
  const pillScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const layout = tabLayouts.current[activeId];
    if (!layout) return;

    Animated.parallel([
      Animated.spring(pillX, {
        toValue: layout.x,
        stiffness: 420,
        damping: 32,
        mass: 0.9,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(pillScale, {
          toValue: 1.06,
          duration: 110,
          useNativeDriver: true,
        }),
        Animated.spring(pillScale, {
          toValue: 1,
          stiffness: 380,
          damping: 24,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    if (isScrollable && scrollRef.current) {
      const targetScroll = Math.max(0, layout.x - dockInnerWidth / 2 + layout.width / 2);
      scrollRef.current.scrollTo({ x: targetScroll, animated: true });
    }
  }, [activeId, hasMeasured, isScrollable, dockInnerWidth, pillX, pillScale]);

  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: Math.max(insets.bottom - 10, 10) },
      ]}
      pointerEvents="box-none"
    >
      <LiquidGlassContainer spacing={8} style={styles.containerWidth}>
        <LiquidGlassSurface
          testID="mobile-dock"
          accessibilityLabel="Mobile Navigation"
          effect="regular"
          interactive
          colorScheme={themeMode}
          style={[
            styles.dock,
            !isNativeLiquidGlassSupported && styles.dockFallbackShadow,
          ]}
          fallbackStyle={{
            backgroundColor: palette.glassBg,
            borderColor: palette.glassBorder,
            borderWidth: 1,
          }}
        >
          <ScrollView
            ref={scrollRef}
            horizontal
            scrollEnabled={isScrollable}
            showsHorizontalScrollIndicator={false}
            style={styles.dockScroll}
            contentContainerStyle={[styles.dockContent, { flexDirection: flexRow }]}
          >
            {/* Animated sliding flat grey pill */}
            {hasMeasured && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.slidingPillWrap,
                  {
                    width: itemWidth,
                    transform: [{ translateX: pillX }, { scale: pillScale }],
                  },
                ]}
              >
                <View style={[styles.slidingPill, { backgroundColor: flatPillBg }]} />
              </Animated.View>
            )}

            {items.map((item) => {
              const Icon = item.icon;
              const active = item.id === activeId;
              return (
                <Pressable
                  key={item.id}
                  testID={`dock-tab-${item.id}`}
                  accessibilityLabel={item.label}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => onSelect(item.id)}
                  onLayout={(e) => {
                    const { x, width } = e.nativeEvent.layout;
                    tabLayouts.current[item.id] = { x, width };
                    if (item.id === activeId && !hasMeasured) {
                      pillX.setValue(x);
                      setHasMeasured(true);
                    }
                  }}
                  style={{ width: itemWidth }}
                >
                  <View style={styles.tab}>
                    {active && item.id === 'settings' ? (
                      <SettingsActiveIcon
                        size={20}
                        color={palette.primary}
                        fill={activeIconFill}
                      />
                    ) : (
                      <Icon
                        size={20}
                        color={active ? palette.primary : palette.mutedForeground}
                        fill={active ? activeIconFill : 'none'}
                      />
                    )}
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.tabLabel,
                        {
                          color: active ? palette.primary : palette.mutedForeground,
                          fontWeight: active ? '700' : '500',
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </LiquidGlassSurface>
      </LiquidGlassContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  containerWidth: {
    width: '100%',
  },
  dock: {
    width: '100%',
    borderRadius: 28,
    paddingHorizontal: 4,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  dockFallbackShadow: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
  },
  dockScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  dockContent: {
    alignItems: 'center',
    position: 'relative',
  },
  slidingPillWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  slidingPill: {
    flex: 1,
    borderRadius: 24,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 24,
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
  },
});
