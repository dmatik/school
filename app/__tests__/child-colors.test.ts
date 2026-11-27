import {
  CHILD_COLOR_TOKENS,
  getChildBadgeStyle,
} from '../src/lib/colors';

describe('Child Color Palette', () => {
  it('defines distinct color tokens for all 8 supported child color IDs', () => {
    const expectedIds = ['blue', 'emerald', 'purple', 'amber', 'rose', 'cyan', 'orange', 'indigo'];
    const actualIds = CHILD_COLOR_TOKENS.map((t) => t.id);
    expect(actualIds).toEqual(expect.arrayContaining(expectedIds));
    expect(CHILD_COLOR_TOKENS).toHaveLength(8);
    expect(new Set(CHILD_COLOR_TOKENS.map((t) => t.solidBg)).size).toBe(8);

    for (const token of CHILD_COLOR_TOKENS) {
      expect(token.labelKey).toMatch(/^account\.color_/);
      expect(token.badgeBgLight).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(token.badgeTextLight).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(token.badgeBgDark).toMatch(/^rgba\(/);
      expect(token.badgeTextDark).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(token.solidBg).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('returns light badge style when isDark is false', () => {
    const emerald = CHILD_COLOR_TOKENS.find((t) => t.id === 'emerald')!;
    const style = getChildBadgeStyle('emerald', false);
    expect(style.bg).toBe(emerald.badgeBgLight);
    expect(style.text).toBe(emerald.badgeTextLight);
    expect(style.solid).toBe(emerald.solidBg);
  });

  it('returns dark badge style when isDark is true', () => {
    const purple = CHILD_COLOR_TOKENS.find((t) => t.id === 'purple')!;
    const style = getChildBadgeStyle('purple', true);
    expect(style.bg).toBe(purple.badgeBgDark);
    expect(style.text).toBe(purple.badgeTextDark);
    expect(style.solid).toBe(purple.solidBg);
  });

  it('maps every defined token cleanly in both light and dark modes', () => {
    for (const token of CHILD_COLOR_TOKENS) {
      expect(getChildBadgeStyle(token.id, false).bg).toBe(token.badgeBgLight);
      expect(getChildBadgeStyle(token.id, true).bg).toBe(token.badgeBgDark);
    }
  });

  it('falls back to neutral slate style when colorId is undefined or unknown', () => {
    expect(getChildBadgeStyle(undefined, false)).toEqual({
      bg: 'rgba(100, 116, 139, 0.12)',
      text: '#334155',
      solid: '#64748b',
    });
    expect(getChildBadgeStyle('nonexistent', true)).toEqual({
      bg: 'rgba(148, 163, 184, 0.18)',
      text: '#e2e8f0',
      solid: '#64748b',
    });
  });

  it('handles null colorId gracefully', () => {
    expect(getChildBadgeStyle(null, false).solid).toBe('#64748b');
  });
});
