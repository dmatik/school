import React from 'react';

// Ensure React Native Reanimated runs cleanly in Jest
jest.mock('react-native-reanimated', () => {
  const { View, Text, Image, ScrollView } = require('react-native');
  const Animated = {
    View,
    Text,
    Image,
    ScrollView,
    createAnimatedComponent: (c: unknown) => c,
  };
  return {
    __esModule: true,
    default: Animated,
    ...Animated,
    useSharedValue: (v: unknown) => ({ value: v }),
    useAnimatedStyle: (fn: () => Record<string, unknown>) => {
      try {
        return fn();
      } catch {
        return {};
      }
    },
    withTiming: (v: unknown) => v,
    withSpring: (v: unknown) => v,
    withRepeat: (v: unknown) => v,
    cancelAnimation: jest.fn(),
    Easing: { linear: jest.fn(), bezier: jest.fn() },
    ZoomIn: { duration: () => ({}) },
    FadeIn: { duration: () => ({}) },
    FadeOut: { duration: () => ({}) },
  };
});

// SafeAreaContext mock with predictable insets
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    SafeAreaView: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(View, props, children),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets, frame },
  };
});

// AsyncStorage in-memory mock
const mockAsyncMemoryStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockAsyncMemoryStore.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockAsyncMemoryStore.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockAsyncMemoryStore.delete(key);
    }),
    clear: jest.fn(async () => {
      mockAsyncMemoryStore.clear();
    }),
  },
}));

// SecureStore in-memory mock
const mockSecureMemoryStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
  isAvailableAsync: jest.fn(async () => true),
  canUseBiometricAuthentication: jest.fn(() => true),
  getItemAsync: jest.fn(async (key: string) => mockSecureMemoryStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureMemoryStore.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureMemoryStore.delete(key);
  }),
}));

// Expo Blur
jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BlurView: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(View, props, children),
    BlurTargetView: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(View, props, children),
  };
});

// Expo Font / Crypto / Print / Sharing / FileSystem / ImagePicker / ImageManipulator
jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
}));

jest.mock('expo-crypto', () => ({
  getRandomBytes: (len: number) => {
    const crypto = require('crypto');
    return new Uint8Array(crypto.randomBytes(len));
  },
}));

jest.mock('expo-print', () => ({
  printAsync: jest.fn(async () => {}),
  printToFileAsync: jest.fn(async () => ({ uri: 'file:///tmp/mock-schedule.pdf' })),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => {}),
}));

jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///tmp/' },
  File: class MockFile {
    uri: string;
    exists = false;
    constructor(...parts: string[]) {
      this.uri = parts.join('/');
    }
    delete() {}
    async move() {}
  },
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
  manipulateAsync: jest.fn(async () => ({ uri: '', base64: '' })),
}));

// Suppress noisy RN Animated warnings in test output
const origWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const first = typeof args[0] === 'string' ? args[0] : '';
  if (first.includes('Animated: `useNativeDriver`')) return;
  origWarn(...args);
};

export function resetMockStorage() {
  mockAsyncMemoryStore.clear();
  mockSecureMemoryStore.clear();
}
