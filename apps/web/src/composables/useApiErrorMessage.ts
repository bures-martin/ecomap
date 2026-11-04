import { useTranslation } from 'i18next-vue';
import { ApiRequestError } from '../api/client.js';
import { i18next } from '../i18n/index.js';
import { translateServerMessage } from '../i18n/serverMessages.js';

/**
 * A message from the server (or the shared validation rules, which are
 * written in English) in the page's language. On the English site it is shown
 * as it is; elsewhere its translation, or `fallback` when it is not one we
 * know - never English on a Danish page.
 */
export function localiseMessage(message: string, fallback: string): string {
  if (i18next.language.startsWith('en')) return message || fallback;
  return (message && translateServerMessage(message)) ?? fallback;
}

/**
 * Turns anything thrown by the API client into a sentence to show the user.
 *
 * The server's own message is preferred when it exists - it is more specific
 * than a generic code ("The Wildlife layer accepts Point, not LineString") -
 * with the translated fallback for network failures and unexpected throws.
 */
export function useApiErrorMessage(): (error: unknown) => string {
  const { t } = useTranslation();

  return (error: unknown): string => {
    if (error instanceof ApiRequestError) {
      return localiseMessage(error.message, t(`errors.${error.code}`));
    }
    if (error instanceof TypeError) {
      /* `fetch` rejects with a TypeError when the network is unreachable. */
      return t('errors.offline');
    }
    return t('app.somethingWentWrong');
  };
}

/** Field-level messages from a failed request, keyed by their dotted path. */
export function fieldIssues(error: unknown): Record<string, string> {
  if (!(error instanceof ApiRequestError)) return {};
  return Object.fromEntries(
    error.issues.map((issue) => [
      issue.path,
      localiseMessage(issue.message, i18next.t('errors.fieldInvalid')),
    ]),
  );
}
