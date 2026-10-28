import { describe, it, expect } from 'vitest';
import { CHILD_COLORS, getChildBadgeClasses, getChildColor } from '../lib/child-colors';

describe('Child Colors Utility', () => {
  it('exports predefined list of vibrant colors', () => {
    expect(CHILD_COLORS.length).toBeGreaterThanOrEqual(8);
    const ids = CHILD_COLORS.map(c => c.id);
    expect(ids).toContain('blue');
    expect(ids).toContain('emerald');
    expect(ids).toContain('purple');
    expect(ids).toContain('rose');
    expect(ids).toContain('amber');
    expect(ids).toContain('cyan');
    expect(ids).toContain('orange');
    expect(ids).toContain('indigo');
  });

  it('returns default styling when colorId is not provided or undefined', () => {
    const defaultClasses = 'bg-muted/70 text-foreground border-border/60';
    expect(getChildBadgeClasses()).toBe(defaultClasses);
    expect(getChildBadgeClasses(null)).toBe(defaultClasses);
    expect(getChildBadgeClasses(undefined)).toBe(defaultClasses);
    expect(getChildBadgeClasses('non-existent-color')).toBe(defaultClasses);
  });

  it('returns appropriate accent classes when a valid colorId is provided', () => {
    const blueClasses = getChildBadgeClasses('blue');
    expect(blueClasses).toContain('bg-blue-500');
    expect(blueClasses).toContain('text-blue-700');
    expect(blueClasses).toContain('border-blue-500');

    const emeraldClasses = getChildBadgeClasses('emerald');
    expect(emeraldClasses).toContain('bg-emerald-500');
    expect(emeraldClasses).toContain('text-emerald-700');
  });

  it('retrieves child color option using getChildColor', () => {
    const color = getChildColor('purple');
    expect(color).toBeDefined();
    expect(color?.id).toBe('purple');
    expect(color?.bg).toBe('bg-purple-500');

    expect(getChildColor('unknown')).toBeUndefined();
  });
});

