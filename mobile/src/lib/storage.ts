import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const KEYS = {
  SERVER_URL: 'school_server_url',
  AUTH_TOKEN: 'school_auth_token',
  THEME: 'school_theme',
  LANGUAGE: 'school_lang',
} as const;

async function setSecure(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getSecure(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteSecure(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const mobileStorage = {
  getServerUrl: () => getSecure(KEYS.SERVER_URL),
  setServerUrl: (url: string) => setSecure(KEYS.SERVER_URL, url),
  clearServerUrl: () => deleteSecure(KEYS.SERVER_URL),

  getAuthToken: () => getSecure(KEYS.AUTH_TOKEN),
  setAuthToken: (token: string) => setSecure(KEYS.AUTH_TOKEN, token),
  clearAuthToken: () => deleteSecure(KEYS.AUTH_TOKEN),

  getTheme: () => AsyncStorage.getItem(KEYS.THEME),
  setTheme: (theme: string) => AsyncStorage.setItem(KEYS.THEME, theme),

  getLanguage: () => AsyncStorage.getItem(KEYS.LANGUAGE),
  setLanguage: (lang: string) => AsyncStorage.setItem(KEYS.LANGUAGE, lang),
};
