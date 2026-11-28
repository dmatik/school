import React, { forwardRef } from 'react';
import {
  Animated,
  Platform,
  View,
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

export interface ScreenScrollViewProps extends ScrollViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * Adaptive screen scroll container:
 * - On mobile web (< 768px), renders a plain <View> in normal document flow so
 *   top-level window scrolling triggers iOS Safari / Android Chrome bar collapse.
 * - On desktop web (>= 768px) and native iOS/Android, renders <Animated.ScrollView>.
 */
export const ScreenScrollView = forwardRef<any, ScreenScrollViewProps>(
  function ScreenScrollView(
    { children, style, contentContainerStyle, ...scrollViewProps },
    ref
  ) {
    const { isDesktop } = useResponsiveLayout();
    const isWebMobile = Platform.OS === 'web' && !isDesktop;

    if (isWebMobile) {
      return (
        <View style={[styles.webMobileContainer, contentContainerStyle]}>
          {children}
        </View>
      );
    }

    return (
      <Animated.ScrollView
        ref={ref}
        style={style}
        contentContainerStyle={contentContainerStyle}
        {...scrollViewProps}
      >
        {children}
      </Animated.ScrollView>
    );
  }
);

const styles = StyleSheet.create({
  webMobileContainer: {
    flexGrow: 1,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
  },
});
