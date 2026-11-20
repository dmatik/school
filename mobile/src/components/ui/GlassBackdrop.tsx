import React from 'react';
import { Platform, UIManager, View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

let NativeBlurView: React.ComponentType<any> | null = null;
const hasNativeBlur =
  Platform.OS !== 'web' && UIManager.getViewManagerConfig?.('ExpoBlurView') != null;

if (hasNativeBlur) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    NativeBlurView = require('expo-blur').BlurView;
  } catch {
    NativeBlurView = null;
  }
}

export function GlassBackdrop() {
  const { palette, isDark } = useTheme();

  return (
    <View pointerEvents="none" style={styles.fill}>
      {NativeBlurView ? (
        <NativeBlurView
          intensity={26}
          tint={isDark ? 'dark' : 'light'}
          style={styles.fill}
        />
      ) : null}
      <View style={[styles.fill, { backgroundColor: palette.glassBg }]} />
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
