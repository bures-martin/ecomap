import { z } from 'zod';

/**
 * Supported interface languages.
 *
 * English is the only complete translation today, but every user-facing string
 * goes through i18next from the start - retrofitting that later is the expensive
 * way round. Danish is here because the first community is on Bornholm.
 */
export const LOCALES = ['en', 'da'] as const;
export type Locale = (typeof LOCALES)[number];
export const localeSchema = z.enum(LOCALES);

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_LABELS: Readonly<Record<Locale, string>> = {
  en: 'English',
  da: 'Dansk',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
