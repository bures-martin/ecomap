import { QueryClient } from '@tanstack/vue-query';
import { ApiRequestError } from './client.js';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        /* Retrying a 403 or a 404 only delays the error the user needs to see. */
        retry: (failureCount, error) => {
          if (error instanceof ApiRequestError && error.status < 500) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
    },
  });
}
