import React, { createContext, useContext, type ComponentRef, type RefObject } from 'react';
import {
  Platform,
  View,
  StyleSheet,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import { useTheme } from '../../theme/ThemeContext';

export type AndroidBlurTargetRef = RefObject<ComponentRef<typeof View> | null>;

const AndroidBlurTargetContext = createContext<AndroidBlurTargetRef | null>(null);

export const AndroidBlurTargetProvider = AndroidBlurTargetContext.Provider;

export function useAndroidBlurTarget(): AndroidBlurTargetRef | null {
  return useContext(AndroidBlurTargetContext);
}

/**
 * On Android, wraps background content in expo-blur's BlurTargetView so sibling
 * BlurViews (dock, FABs, modal backdrops) can render real hardware blur.
 * On iOS and web, renders a plain View with identical layout and zero overhead.
 */
export function AndroidBlurTarget({
  targetRef,
  style,
  pointerEvents,
  children,
}: {
  targetRef: AndroidBlurTargetRef;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: ViewProps['pointerEvents'];
  children: React.ReactNode;
}) {
  if (Platform.OS === 'android') {
    return (
      <BlurTargetView ref={targetRef} style={style} pointerEvents={pointerEvents}>
        {children}
      </BlurTargetView>
    );
  }
  return (
    <View style={style} pointerEvents={pointerEvents}>
      {children}
    </View>
  );
}

export function getGlassShadow(isDark: boolean) {
  return {
    boxShadow: isDark
      ? '0 2px 10px rgba(0, 0, 0, 0.16)'
      : '0 2px 10px rgba(0, 0, 0, 0.05)',
  };
}

export function GlassBackdrop({ borderRadius = 999 }: { borderRadius?: number }) {
  const { palette, isDark } = useTheme();
  const androidBlurTarget = useAndroidBlurTarget();

  return (
    <View
      pointerEvents="none"
      style={[styles.fill, { borderRadius, overflow: 'hidden', zIndex: 0 }]}
    >
      <BlurView
        intensity={35}
        tint={isDark ? 'dark' : 'light'}
        {...(Platform.OS === 'android' && androidBlurTarget
          ? {
              blurTarget: androidBlurTarget,
              blurMethod: 'dimezisBlurView' as const,
              blurReductionFactor: 2,
            }
          : {})}
        style={[styles.fill, { borderRadius }]}
      />
      <View style={[styles.fill, { backgroundColor: palette.glassBg }]} />
      <View
        style={[
          styles.fill,
          {
            borderRadius,
            borderWidth: 1,
            borderColor: palette.glassBorder,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
