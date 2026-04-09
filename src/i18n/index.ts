import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ar from './locales/ar.json';
import en from './locales/en.json';
import ur from './locales/ur.json';
import hi from './locales/hi.json';

export const LANG_KEY = '@jamaat_calc_lang';

export type AppLanguage = 'en' | 'ur' | 'hi' | 'ar';

const resources = {
  en: { translation: en },
  ur: { translation: ur },
  hi: { translation: hi },
  ar: { translation: ar },
} as const;

export async function initI18n(): Promise<void> {
  let lng: AppLanguage = 'en';
  try {
    const stored = await AsyncStorage.getItem(LANG_KEY);
    if (stored === 'en' || stored === 'ur' || stored === 'hi' || stored === 'ar') lng = stored;
  } catch {
    /* ignore */
  }

  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });
}

export async function setAppLanguage(lng: AppLanguage): Promise<void> {
  await AsyncStorage.setItem(LANG_KEY, lng);
  await i18n.changeLanguage(lng);
}

export default i18n;
