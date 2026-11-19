import React from 'react';
import { Platform, TurboModuleRegistry, View, type ViewProps } from 'react-native';
import type {
  LiquidGlassViewProps,
  LiquidGlassContainerViewProps,
} from '@callstack/liquid-glass';

type LiquidGlassModule = typeof import('@callstack/liquid-glass');

let cachedModule: LiquidGlassModule | null = null;
let nativeLiquidGlassAvailable = false;

if (Platform.OS === 'ios' && TurboModuleRegistry.get('NativeLiquidGlassModule') != null) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('@callstack/liquid-glass') as LiquidGlassModule;
    nativeLiquidGlassAvailable = Boolean(cachedModule?.isLiquidGlassSupported);
  } catch {
    cachedModule = null;
    nativeLiquidGlassAvailable = false;
  }
}

export const isNativeLiquidGlassSupported = nativeLiquidGlassAvailable;

export function LiquidGlassSurface({
  fallbackStyle,
  style,
  children,
  ...rest
}: LiquidGlassViewProps & { fallbackStyle?: ViewProps['style'] }) {
  if (nativeLiquidGlassAvailable && cachedModule?.LiquidGlassView) {
    const NativeGlass = cachedModule.LiquidGlassView;
    return (
      <NativeGlass style={style} {...rest}>
        {children}
      </NativeGlass>
    );
  }

  return (
    <View style={[style, fallbackStyle]} {...rest}>
      {children}
    </View>
  );
}

export function LiquidGlassContainer({
  spacing,
  style,
  children,
  ...rest
}: LiquidGlassContainerViewProps) {
  if (nativeLiquidGlassAvailable && cachedModule?.LiquidGlassContainerView) {
    const NativeContainer = cachedModule.LiquidGlassContainerView;
    return (
      <NativeContainer spacing={spacing} style={style} {...rest}>
        {children}
      </NativeContainer>
    );
  }

  return (
    <View style={style} {...rest}>
      {children}
    </View>
  );
}
