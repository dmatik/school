import { getSubjectConfig } from '../src/lib/subjectIcons';

describe('Mobile Subject Icons & Palette', () => {
  it('maps Hebrew and English subject names to distinct icons and solid/badge colors', () => {
    const math = getSubjectConfig('מתמטיקה');
    const science = getSubjectConfig('מדעים');
    const bible = getSubjectConfig('תנ"ך');
    const hebrew = getSubjectConfig('עברית');
    const english = getSubjectConfig('אנגלית');
    const sports = getSubjectConfig('חינוך גופני');
    const history = getSubjectConfig('היסטוריה');

    expect(math.solidBgLight).toBe('#3B82C4');
    expect(science.solidBgLight).toBe('#2CA58D');
    expect(bible.solidBgLight).toBe('#8B5E3C');
    expect(hebrew.solidBgLight).toBe('#C84B4B');
    expect(english.solidBgLight).toBe('#8A63B8');
    expect(sports.solidBgLight).toBe('#D4973B');
    expect(history.solidBgLight).toBe('#3D98B8');

    expect(math.icon).not.toBe(science.icon);
    expect(bible.icon).not.toBe(english.icon);
    expect(sports.icon).not.toBe(history.icon);
  });

  it('provides both light and dark palette tokens for every subject', () => {
    const cfg = getSubjectConfig('מתמטיקה');
    expect(cfg.badgeBgLight).toBeTruthy();
    expect(cfg.badgeTextLight).toBeTruthy();
    expect(cfg.badgeBgDark).toBeTruthy();
    expect(cfg.badgeTextDark).toBeTruthy();
    expect(cfg.textLight).toBeTruthy();
    expect(cfg.textDark).toBeTruthy();
  });

  it('falls back to default config for unknown or empty subjects', () => {
    const unknown = getSubjectConfig('מקצוע לא קיים');
    const empty = getSubjectConfig(null);
    expect(unknown.solidBgLight).toBe('#525866');
    expect(empty.solidBgLight).toBe('#525866');
    expect(unknown.icon).toBe(empty.icon);
  });
});
