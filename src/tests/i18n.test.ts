import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('i18n default language configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    document.documentElement.dir = '';
    document.documentElement.lang = '';
  });

  it('defaults to Hebrew (he / rtl) when localStorage is empty even if navigator.language is en-US', async () => {
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('en-US');
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['en-US', 'en']);

    const { default: i18n } = await import('../i18n');

    expect(i18n.language).toBe('he');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('he');
  });

  it('respects explicit English preference stored in localStorage', async () => {
    localStorage.setItem('i18nextLng', 'en');

    const { default: i18n } = await import('../i18n');

    expect(i18n.language).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
  });
});
