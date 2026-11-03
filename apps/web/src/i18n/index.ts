import { DEFAULT_LOCALE, LOCALES } from '@ecomap/shared';
import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { readonly, ref, type Ref } from 'vue';
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

const language = ref<string>(DEFAULT_LOCALE);

/*
 * i18next is not reactive itself; this mirrors the active language into a ref
 * so dates, number formats and `<html lang>` follow a language switch.
 */
i18next.on('languageChanged', () => {
  language.value = i18next.resolvedLanguage ?? i18next.language;
  if (typeof document !== 'undefined') document.documentElement.lang = language.value;
});

/** The resolved UI language, e.g. for `toLocaleDateString`. */
export function useLanguage(): Readonly<Ref<string>> {
  return readonly(language);
}

export async function initI18n(): Promise<typeof i18next> {
  if (i18next.isInitialized) return i18next;

  await i18next.use(LanguageDetector).init({
    resources,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...LOCALES],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    showSupportNotice: false,
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'ecomap.locale',
      caches: ['localStorage'],
    },
  });

  return i18next;
}

export { i18next };
