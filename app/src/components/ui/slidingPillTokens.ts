export const PILL_SPRING = {
  stiffness: 450,
  damping: 35,
  mass: 1,
} as const;

export const PILL_COLORS = {
  light: {
    color: 'rgb(15, 23, 42)',
    alpha: 0.08,
    rgba: 'rgba(15, 23, 42, 0.08)',
  },
  dark: {
    color: 'rgb(6, 10, 18)',
    alpha: 0.55,
    rgba: 'rgba(6, 10, 18, 0.55)',
  },
} as const;

export interface SlidingPillProps {
  x: number;
  width: number;
  height: number;
  isDark: boolean;
  visible?: boolean;
  animated?: boolean;
  top?: number;
}
