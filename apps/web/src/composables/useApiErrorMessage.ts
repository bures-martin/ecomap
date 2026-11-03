import { useTranslation } from 'i18next-vue';
import { ApiRequestError } from '../api/client.js';

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
      return error.message || t(`errors.${error.code}`);
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
  return Object.fromEntries(error.issues.map((issue) => [issue.path, issue.message]));
}
