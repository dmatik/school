import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../theme/ThemeContext';

export function GlassBackdrop({ borderRadius = 999 }: { borderRadius?: number }) {
  const { palette, isDark } = useTheme();

  return (
    <View pointerEvents="none" style={[styles.fill, { borderRadius, overflow: 'hidden' }]}>
      <BlurView
        intensity={35}
        tint={isDark ? 'dark' : 'light'}
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
