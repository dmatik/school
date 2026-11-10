import { describe, it, expect } from 'vitest';
import { CHILD_COLORS, getChildBadgeClasses, getChildColor, getChildTextColor, getChildAccentColor } from '../lib/child-colors';

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
    const defaultClasses = 'bg-muted/70 text-foreground border-transparent';
    expect(getChildBadgeClasses()).toBe(defaultClasses);
    expect(getChildBadgeClasses(null)).toBe(defaultClasses);
    expect(getChildBadgeClasses(undefined)).toBe(defaultClasses);
    expect(getChildBadgeClasses('non-existent-color')).toBe(defaultClasses);
  });

  it('returns appropriate accent classes when a valid colorId is provided', () => {
    const blueClasses = getChildBadgeClasses('blue');
    expect(blueClasses).toContain('bg-[#D4E6F9]');
    expect(blueClasses).toContain('text-[#16324F]');
    expect(blueClasses).toContain('border-transparent');

    const emeraldClasses = getChildBadgeClasses('emerald');
    expect(emeraldClasses).toContain('bg-[#CBEEE8]');
    expect(emeraldClasses).toContain('text-[#143D35]');
  });

  it('retrieves child color option using getChildColor', () => {
    const color = getChildColor('purple');
    expect(color).toBeDefined();
    expect(color?.id).toBe('purple');
    expect(color?.bg).toBe('bg-[#8A63B8]');

    expect(getChildColor('unknown')).toBeUndefined();
  });

  it('retrieves child text/accent color class using getChildTextColor', () => {
    expect(getChildTextColor()).toBe('text-primary');
    expect(getChildTextColor(null)).toBe('text-primary');
    expect(getChildTextColor('unknown')).toBe('text-primary');

    expect(getChildTextColor('blue')).toContain('text-[#16324F]');
    expect(getChildTextColor('emerald')).toContain('text-[#143D35]');
  });

  it('retrieves child solid accent color class using getChildAccentColor', () => {
    expect(getChildAccentColor()).toBe('bg-muted-foreground/40');
    expect(getChildAccentColor(null)).toBe('bg-muted-foreground/40');
    expect(getChildAccentColor('unknown')).toBe('bg-muted-foreground/40');

    expect(getChildAccentColor('blue')).toBe('bg-[#3B82C4]');
    expect(getChildAccentColor('emerald')).toBe('bg-[#2CA58D]');
    expect(getChildAccentColor('purple')).toBe('bg-[#8A63B8]');
  });
});

