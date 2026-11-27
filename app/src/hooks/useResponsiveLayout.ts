import { useWindowDimensions } from 'react-native';

export const DESKTOP_BREAKPOINT = 768; // matches Tailwind md:
export const SIDEBAR_WIDTH = 256; // matches w-64
export const PAGE_MAX_WIDTH = 768; // matches max-w-3xl

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  return {
    width,
    height,
    isDesktop,
    pageMaxWidth: PAGE_MAX_WIDTH,
    horizontalPadding: isDesktop ? 24 : 16,
  };
}
