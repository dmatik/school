import React, { startTransition, useCallback, useEffect, useId, useRef, useState } from 'react';
import {
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
import { heeboFont } from '../../theme/typography';
import { useDirection } from '../../i18n';
import { GlassBackdrop } from './GlassBackdrop';
import { SlidingPill } from './SlidingPill';

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
  const { palette, isDark } = useTheme();
  const { flexRow } = useDirection();
  const { width: screenWidth } = useWindowDimensions();
  const inactiveColor = palette.foreground;
  const activeIconFill = isDark
    ? 'rgba(87, 158, 224, 0.26)'
    : 'rgba(59, 130, 196, 0.20)';

  const isScrollable = items.length > 5;
  const isFiveOrMore = items.length >= 5;
  const maxDockWidth = Math.min(352, screenWidth - 24);
  const dockInnerWidth = Math.max(maxDockWidth - 12, 240);
  const itemWidth = isScrollable
    ? Math.floor(dockInnerWidth / 5)
    : isFiveOrMore
    ? Math.floor(dockInnerWidth / items.length)
    : Math.min(85, Math.floor(dockInnerWidth / Math.max(items.length, 1)));

  const scrollRef = useRef<React.ComponentRef<typeof ScrollView> | null>(null);
  const tabLayouts = useRef<Record<string, { x: number; width: number; height: number }>>({});
  const [hasMeasured, setHasMeasured] = useState(false);
  const [pillHeight, setPillHeight] = useState(0);
  const [visualActive, setVisualActive] = useState(activeId);
  const lastPressedRef = useRef<string | null>(null);
  const hasActiveItem = items.some((item) => item.id === activeId);
  const wasActiveRef = useRef(hasActiveItem);
  const [pillState, setPillState] = useState({
    x: 0,
    visible: hasActiveItem,
    animated: false,
  });

  const scrollToLayout = useCallback(
    (layout: { x: number; width: number }) => {
      if (isScrollable && scrollRef.current) {
        const targetScroll = Math.max(0, layout.x - dockInnerWidth / 2 + layout.width / 2);
        scrollRef.current.scrollTo({ x: targetScroll, animated: true });
      }
    },
    [isScrollable, dockInnerWidth]
  );

  useEffect(() => {
    setVisualActive(activeId);

    // If this change was already animated optimistically in handlePress, avoid re-triggering.
    if (lastPressedRef.current === activeId) {
      lastPressedRef.current = null;
      return;
    }
    lastPressedRef.current = null;

    const layout = tabLayouts.current[activeId];
    if (!hasActiveItem || !layout) {
      setPillState((prev) => ({ ...prev, visible: false, animated: true }));
      wasActiveRef.current = false;
      return;
    }

    setPillState({
      x: layout.x,
      visible: true,
      animated: hasMeasured && wasActiveRef.current,
    });
    if (!hasMeasured) setHasMeasured(true);
    wasActiveRef.current = true;
    scrollToLayout(layout);
  }, [activeId, hasActiveItem, hasMeasured, scrollToLayout]);

  const handlePress = (id: string) => {
    const layout = tabLayouts.current[id];
    if (layout) {
      setPillState({
        x: layout.x,
        visible: true,
        animated: hasMeasured && wasActiveRef.current,
      });
      if (!hasMeasured) setHasMeasured(true);
      wasActiveRef.current = true;
      scrollToLayout(layout);
    }
    lastPressedRef.current = id;
    setVisualActive(id);
    startTransition(() => {
      onSelect(id);
    });
  };

  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: Math.max(insets.bottom - 10, 10) },
      ]}
      pointerEvents="box-none"
    >
      <View
        testID="mobile-dock"
        accessibilityLabel="Mobile Navigation"
        style={[
          styles.dock,
          {
            maxWidth: maxDockWidth,
          },
        ]}
      >
        <GlassBackdrop />
        <ScrollView
            ref={scrollRef}
            horizontal
            scrollEnabled={isScrollable}
            showsHorizontalScrollIndicator={false}
            style={styles.dockScroll}
            contentContainerStyle={[styles.dockContent, { flexDirection: flexRow }]}
          >
            {/* Core Animation (iOS) / Reanimated (Android & web) sliding pill */}
            {hasMeasured && pillHeight > 0 && (
              <SlidingPill
                x={pillState.x}
                width={itemWidth}
                height={pillHeight}
                isDark={isDark}
                visible={pillState.visible}
                animated={pillState.animated}
              />
            )}

            {items.map((item) => {
              const Icon = item.icon;
              const active = item.id === visualActive;
              return (
                <Pressable
                  key={item.id}
                  testID={`dock-tab-${item.id}`}
                  accessibilityLabel={item.label}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => handlePress(item.id)}
                  onLayout={(e) => {
                    const { x, width, height } = e.nativeEvent.layout;
                    tabLayouts.current[item.id] = { x, width, height };
                    if (height > 0 && Math.abs(height - pillHeight) > 0.5) {
                      setPillHeight(height);
                    }
                    if (item.id === visualActive && !hasMeasured) {
                      setPillState({ x, visible: true, animated: false });
                      setHasMeasured(true);
                    }
                  }}
                  style={{ width: itemWidth }}
                >
                  <View style={styles.tab}>
                    {active && item.id === 'settings' ? (
                      <SettingsActiveIcon
                        size={24}
                        color={palette.primary}
                        fill={activeIconFill}
                      />
                    ) : (
                      <Icon
                        size={24}
                        color={active ? palette.primary : inactiveColor}
                        fill={active ? activeIconFill : 'none'}
                      />
                    )}
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.tabLabel,
                        {
                          color: active ? palette.primary : inactiveColor,
                        },
                        heeboFont(active ? '600' : '500'),
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  containerWidth: {
    width: '100%',
  },
  dock: {
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  dockScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  dockContent: {
    alignItems: 'center',
    position: 'relative',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 999,
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    lineHeight: 12,
    includeFontPadding: false,
  },
});
