import React from 'react';
import { Platform, Pressable, Text } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { DARK_PALETTE, LIGHT_PALETTE } from '../src/lib/colors';

function ThemeTestHarness() {
  const { isDark, setThemeMode } = useTheme();
  return (
    <>
      <Text testID="theme-state">{isDark ? 'dark' : 'light'}</Text>
      <Pressable testID="set-dark" onPress={() => setThemeMode('dark')} />
      <Pressable testID="set-light" onPress={() => setThemeMode('light')} />
    </>
  );
}

function createFakeDocument() {
  const metaTags: Array<{
    attrs: Record<string, string>;
    getAttribute: (name: string) => string | null;
    setAttribute: (name: string, value: string) => void;
    hasAttribute: (name: string) => boolean;
    remove: () => void;
  }> = [];

  const makeMeta = (initialAttrs: Record<string, string> = {}) => {
    const entry = {
      attrs: { ...initialAttrs },
      getAttribute(name: string) {
        return this.attrs[name] ?? null;
      },
      setAttribute(name: string, value: string) {
        this.attrs[name] = value;
      },
      hasAttribute(name: string) {
        return Object.prototype.hasOwnProperty.call(this.attrs, name);
      },
      remove() {
        const idx = metaTags.indexOf(entry);
        if (idx !== -1) metaTags.splice(idx, 1);
      },
    };
    return entry;
  };

  // Seed media-scoped theme-color tags as exported in index.html
  metaTags.push(
    makeMeta({
      name: 'theme-color',
      media: '(prefers-color-scheme: light)',
      content: LIGHT_PALETTE.background,
    }),
    makeMeta({
      name: 'theme-color',
      media: '(prefers-color-scheme: dark)',
      content: DARK_PALETTE.background,
    })
  );

  const head = {
    querySelectorAll(selector: string) {
      if (selector === 'meta[name="theme-color"]') {
        return metaTags.filter((m) => m.attrs.name === 'theme-color');
      }
      return [];
    },
    querySelector(selector: string) {
      if (selector === 'meta[name="color-scheme"]') {
        return metaTags.find((m) => m.attrs.name === 'color-scheme') ?? null;
      }
      return null;
    },
    appendChild(node: any) {
      metaTags.push(node);
      return node;
    },
  };

  const doc = {
    head,
    documentElement: { style: {} as Record<string, string> },
    body: { style: {} as Record<string, string> },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    createElement(tag: string) {
      if (tag === 'meta') return makeMeta();
      return {};
    },
  };

  return { doc, metaTags };
}

describe('ThemeProvider web chrome synchronization', () => {
  const originalPlatform = Platform.OS;
  const originalDocument = (globalThis as any).document;

  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'web',
    });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatform,
    });
    if (originalDocument === undefined) {
      delete (globalThis as any).document;
    } else {
      (globalThis as any).document = originalDocument;
    }
  });

  it('syncs theme-color, color-scheme, and html/body background across light and dark switches', async () => {
    const { doc, metaTags } = createFakeDocument();
    (globalThis as any).document = doc;

    const screen = render(
      <ThemeProvider>
        <ThemeTestHarness />
      </ThemeProvider>
    );

    await act(async () => {});

    const getThemeMetas = () => metaTags.filter((m) => m.attrs.name === 'theme-color');
    const getSchemeMeta = () => metaTags.find((m) => m.attrs.name === 'color-scheme');

    // Initial light mode replaces media-scoped tags with single authoritative tag
    expect(getThemeMetas()).toHaveLength(1);
    expect(getThemeMetas()[0].getAttribute('content')).toBe(LIGHT_PALETTE.background);
    expect(getThemeMetas()[0].hasAttribute('media')).toBe(false);
    expect(getSchemeMeta()?.getAttribute('content')).toBe('light');
    expect(doc.documentElement.style.colorScheme).toBe('light');
    expect(doc.documentElement.style.backgroundColor).toBe(LIGHT_PALETTE.background);
    expect(doc.body.style.backgroundColor).toBe(LIGHT_PALETTE.background);

    // Switch to dark mode
    await act(async () => {
      fireEvent.press(screen.getByTestId('set-dark'));
    });

    expect(screen.getByTestId('theme-state').props.children).toBe('dark');
    expect(getThemeMetas()).toHaveLength(1);
    expect(getThemeMetas()[0].getAttribute('content')).toBe(DARK_PALETTE.background);
    expect(getSchemeMeta()?.getAttribute('content')).toBe('dark');
    expect(doc.documentElement.style.colorScheme).toBe('dark');
    expect(doc.documentElement.style.backgroundColor).toBe(DARK_PALETTE.background);
    expect(doc.body.style.backgroundColor).toBe(DARK_PALETTE.background);

    // Switch back to light mode
    await act(async () => {
      fireEvent.press(screen.getByTestId('set-light'));
    });

    expect(screen.getByTestId('theme-state').props.children).toBe('light');
    expect(getThemeMetas()[0].getAttribute('content')).toBe(LIGHT_PALETTE.background);
    expect(getSchemeMeta()?.getAttribute('content')).toBe('light');
    expect(doc.documentElement.style.colorScheme).toBe('light');
    expect(doc.documentElement.style.backgroundColor).toBe(LIGHT_PALETTE.background);
    expect(doc.body.style.backgroundColor).toBe(LIGHT_PALETTE.background);
  });
});
