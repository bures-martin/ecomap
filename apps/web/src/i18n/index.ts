import { DEFAULT_LOCALE, LOCALES } from '@ecomap/shared';
import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import da from './locales/da.json';
import en from './locales/en.json';

/**
 * Every user-facing string goes through i18next from day one.
 *
 * English is complete; Danish is partial and falls back to English key by key,
 * which is exactly what we want while the first community's translation is
 * being filled in.
 */
export const resources = {
  en: { translation: en },
  da: { translation: da },
} as const;

/** The shape of the translation catalogue, so a missing key is a type error. */
export type TranslationKeys = typeof en;

export async function initI18n(): Promise<typeof i18next> {
  if (i18next.isInitialized) return i18next;

  await i18next
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: DEFAULT_LOCALE,
      supportedLngs: [...LOCALES],
      nonExplicitSupportedLngs: true,
      interpolation: { escapeValue: false },
      detection: {
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: 'ecomap.locale',
        caches: ['localStorage'],
      },
    });

  return i18next;
}

export { i18next };
