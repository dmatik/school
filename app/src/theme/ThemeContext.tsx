import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { DARK_PALETTE, LIGHT_PALETTE, ThemePalette } from '../lib/colors';
import { mobileStorage } from '../lib/storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  themeMode: ThemeMode;
  isDark: boolean;
  palette: ThemePalette;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'system',
  isDark: false,
  palette: LIGHT_PALETTE,
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    mobileStorage.getTheme().then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemeModeState(saved);
      }
    });
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    mobileStorage.setTheme(mode);
  };

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  const palette = isDark ? DARK_PALETTE : LIGHT_PALETTE;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const scheme = isDark ? 'dark' : 'light';
    const head = document.head;

    if (head) {
      // Replace any media-scoped theme-color tags with a single authoritative tag
      // so Safari chrome reflects manual Light/Dark overrides immediately.
      const existingThemeMetas = Array.from(
        head.querySelectorAll('meta[name="theme-color"]')
      );
      let primaryMeta = existingThemeMetas.find((el) => !el.hasAttribute('media'));
      for (const el of existingThemeMetas) {
        if (el !== primaryMeta) {
          el.remove();
        }
      }
      if (!primaryMeta) {
        primaryMeta = document.createElement('meta');
        primaryMeta.setAttribute('name', 'theme-color');
        head.appendChild(primaryMeta);
      }
      primaryMeta.setAttribute('content', palette.background);

      let schemeMeta = head.querySelector('meta[name="color-scheme"]');
      if (!schemeMeta) {
        schemeMeta = document.createElement('meta');
        schemeMeta.setAttribute('name', 'color-scheme');
        head.appendChild(schemeMeta);
      }
      schemeMeta.setAttribute('content', scheme);
    }

    document.documentElement.style.colorScheme = scheme;
    document.documentElement.style.backgroundColor = palette.background;
    if (document.body) {
      document.body.style.backgroundColor = palette.background;
    }
  }, [isDark, palette.background]);

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, palette, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
