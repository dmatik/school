import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { PILL_COLORS, PILL_SPRING, type SlidingPillProps } from './slidingPillTokens';

export { PILL_SPRING, PILL_COLORS, type SlidingPillProps } from './slidingPillTokens';

const MID_BASE_WIDTH = 100;

/**
 * Transform-only capsule pill driven by Reanimated shared values.
 * Renders two circular end caps and a scaled center bar inside an
 * opacity-grouped container so width changes never squash border-radius
 * and overlapping pieces never double-tint.
 */
export function SlidingPill({
  x,
  width,
  height,
  isDark,
  visible = true,
  animated = true,
  top = 0,
}: SlidingPillProps) {
  const { color, alpha } = isDark ? PILL_COLORS.dark : PILL_COLORS.light;

  const animX = useSharedValue(x);
  const animW = useSharedValue(width);
  const animVisible = useSharedValue(visible ? 1 : 0);
  const isFirstRender = useRef(true);
  const wasVisibleRef = useRef(visible);

  useEffect(() => {
    const shouldAnimateGeometry =
      !isFirstRender.current && animated && visible && wasVisibleRef.current;

    if (!shouldAnimateGeometry) {
      animX.value = x;
      animW.value = width;
    } else {
      animX.value = withSpring(x, PILL_SPRING);
      animW.value = withSpring(width, PILL_SPRING);
    }

    if (isFirstRender.current || !animated) {
      animVisible.value = visible ? 1 : 0;
    } else if (visible !== wasVisibleRef.current) {
      animVisible.value = withTiming(visible ? 1 : 0, {
        duration: visible ? 160 : 140,
      });
    }

    isFirstRender.current = false;
    wasVisibleRef.current = visible;
  }, [x, width, visible, animated, animX, animW, animVisible]);

  const groupStyle = useAnimatedStyle(() => ({
    opacity: alpha * animVisible.value,
  }));

  const startCapStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: animX.value }],
  }));

  const endCapStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: Math.max(animX.value, animX.value + animW.value - height) }],
  }));

  const midBarStyle = useAnimatedStyle(() => {
    const mw = Math.max(0, animW.value - height);
    return {
      transform: [
        { translateX: animX.value + height / 2 + (mw - MID_BASE_WIDTH) / 2 },
        { scaleX: mw / MID_BASE_WIDTH },
      ],
    };
  });

  if (height <= 0 || width <= 0) return null;

  const capRadius = height / 2;

  return (
    <Animated.View
      pointerEvents="none"
      needsOffscreenAlphaCompositing
      style={[
        styles.group,
        { top, height },
        groupStyle,
      ]}
    >
      <Animated.View
        style={[
          styles.piece,
          {
            width: height,
            height,
            borderRadius: capRadius,
            backgroundColor: color,
          },
          startCapStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.piece,
          {
            width: MID_BASE_WIDTH,
            height,
            backgroundColor: color,
          },
          midBarStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.piece,
          {
            width: height,
            height,
            borderRadius: capRadius,
            backgroundColor: color,
          },
          endCapStyle,
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  group: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  piece: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
