import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from '@ecomap/shared';
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

const STORAGE_KEY = 'ecomap.locale';

/**
 * The language switch is prepared but switched off for now: the Bornholm
 * showcase runs in Danish only. With it off, everyone gets the community's
 * default language (an admin setting), starting from START_LANGUAGE until the
 * settings arrive. To offer the switch again, set VITE_LANGUAGE_SWITCH=true
 * and put <LanguageMenu /> back in AppShell.vue.
 */
export const LANGUAGE_SWITCH_ENABLED = import.meta.env.VITE_LANGUAGE_SWITCH === 'true';
const START_LANGUAGE: Locale = 'da';

function storedLanguage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Whether the browser asks for a language the app speaks, e.g. da-DK or en-GB. */
function browserSpeaksSupported(): boolean {
  const languages = typeof navigator === 'undefined' ? [] : navigator.languages;
  return languages.some((tag) => isLocale(tag.split('-')[0]?.toLowerCase()));
}

/**
 * True when the language came from the visitor - picked in the menu earlier, or
 * asked for by their browser. Otherwise the community's own default applies.
 */
let visitorHasLanguage = false;

/** Remembers a language picked in the menu, for later visits. */
export function rememberLanguage(locale: Locale): void {
  visitorHasLanguage = true;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* Not remembered across visits, but switched for now. */
  }
}

/**
 * The community's default language (an admin setting), for visitors whose
 * browser speaks none of the app's languages - a German browser on the
 * Bornholm map gets Danish, not the built-in English.
 */
export function applyCommunityLanguage(locale: string): void {
  if (visitorHasLanguage || !isLocale(locale) || i18next.language === locale) return;
  void i18next.changeLanguage(locale);
}

export async function initI18n(): Promise<typeof i18next> {
  if (i18next.isInitialized) return i18next;
  if (!LANGUAGE_SWITCH_ENABLED) {
    await i18next.init({
      resources,
      lng: START_LANGUAGE,
      fallbackLng: DEFAULT_LOCALE,
      supportedLngs: [...LOCALES],
      interpolation: { escapeValue: false },
      showSupportNotice: false,
    });
    return i18next;
  }

  visitorHasLanguage = storedLanguage() !== null || browserSpeaksSupported();

  await i18next.use(LanguageDetector).init({
    resources,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...LOCALES],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    showSupportNotice: false,
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: STORAGE_KEY,
      /* Only a pick in the menu is remembered - see rememberLanguage. */
      caches: [],
    },
  });

  return i18next;
}

export { i18next };
