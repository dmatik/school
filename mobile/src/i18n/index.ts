import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import heTranslations from '../../../src/locales/he.json';
import enTranslations from '../../../src/locales/en.json';
import { mobileStorage } from '../lib/storage';

i18n.use(initReactI18next).init({
  resources: {
    he: { translation: heTranslations },
    en: { translation: enTranslations },
  },
  lng: 'he',
  fallbackLng: 'he',
  interpolation: {
    escapeValue: false,
  },
});

export async function hydrateLanguage(): Promise<void> {
  const saved = await mobileStorage.getLanguage();
  if (saved === 'en' || saved === 'he') {
    await i18n.changeLanguage(saved);
  }
}

export async function setAppLanguage(lang: 'he' | 'en'): Promise<void> {
  await mobileStorage.setLanguage(lang);
  await i18n.changeLanguage(lang);
}

export function useDirection() {
  const isRTL = !(i18n.language || 'he').startsWith('en');
  return {
    isRTL,
    flexRow: isRTL ? ('row-reverse' as const) : ('row' as const),
    textAlign: isRTL ? ('right' as const) : ('left' as const),
    writingDirection: isRTL ? ('rtl' as const) : ('ltr' as const),
  };
}

export default i18n;
