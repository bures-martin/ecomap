import {
  hasPermission,
  type AuthSession,
  type CurrentUser,
  type LoginInput,
  type Permission,
  type RegisterInput,
} from '@ecomap/shared';
import type { QueryClient } from '@tanstack/vue-query';
import { inject, ref, shallowRef, type App, type InjectionKey } from 'vue';
import { setAccessToken, setSessionRefresher } from '../api/client.js';
import { authApi } from '../api/endpoints.js';

/**
 * Session handling.
 *
 * The access token is held in memory only. On a page load we ask the API to
 * refresh using the httpOnly cookie, which restores the session without ever
 * putting a credential somewhere a script could read it.
 *
 * `user` and `isLoading` are getters over refs, so reading them inside a
 * template or `computed` tracks them like any other reactive value.
 */

export interface Auth {
  readonly user: CurrentUser | null;
  /** True until the initial refresh attempt has settled. */
  readonly isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<void>;
  /** Takes a fresh copy of the user that an API call already returned. */
  setUser: (user: CurrentUser) => void;
  can: (permission: Permission) => boolean;
}

const AUTH_KEY: InjectionKey<Auth> = Symbol('auth');

/** Refresh this many seconds before the token actually expires. */
const REFRESH_SKEW_SECONDS = 60;
const MINIMUM_REFRESH_DELAY_SECONDS = 30;

export interface AuthPlugin {
  readonly auth: Auth;
  install: (app: App) => void;
}

export function createAuth(
  queryClient: QueryClient,
  options: { restoreSession?: boolean } = {},
): AuthPlugin {
  const restoreSession = options.restoreSession ?? true;
  const user = shallowRef<CurrentUser | null>(null);
  const isLoading = ref(restoreSession);
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  const clearRefreshTimer = (): void => {
    if (refreshTimer !== null) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  };

  const clearSession = (): void => {
    clearRefreshTimer();
    setAccessToken(null);
    user.value = null;
  };

  const applySession = (session: AuthSession): void => {
    setAccessToken(session.accessToken);
    user.value = session.user;

    clearRefreshTimer();
    const delaySeconds = Math.max(
      session.expiresIn - REFRESH_SKEW_SECONDS,
      MINIMUM_REFRESH_DELAY_SECONDS,
    );
    refreshTimer = setTimeout(() => {
      void refreshSession();
    }, delaySeconds * 1000);
  };

  /**
   * Exchanges the refresh cookie for a new access token, and hands the token
   * back so the API client can retry the request that triggered it.
   */
  async function refreshSession(): Promise<string | null> {
    try {
      const session = await authApi.refresh();
      applySession(session);
      return session.accessToken;
    } catch {
      clearSession();
      return null;
    }
  }

  const auth: Auth = {
    get user() {
      return user.value;
    },
    get isLoading() {
      return isLoading.value;
    },
    login: async (input) => {
      applySession(await authApi.login(input));
      await queryClient.invalidateQueries();
    },
    register: async (input) => {
      applySession(await authApi.register(input));
      await queryClient.invalidateQueries();
    },
    logout: async () => {
      try {
        await authApi.logout();
      } finally {
        clearSession();
        /* Drop everything cached: what a signed-out visitor may see is different. */
        queryClient.clear();
      }
    },
    reloadUser: async () => {
      try {
        user.value = await authApi.me();
      } catch {
        clearSession();
      }
    },
    setUser: (next) => {
      /* Only ever the signed-in account: never let a stale response swap users. */
      if (user.value?.id === next.id) user.value = next;
    },
    can: (permission) => hasPermission(user.value?.role, permission),
  };

  return {
    auth,
    install: (app) => {
      app.provide(AUTH_KEY, auth);

      /* Let the API client recover from a 401 by refreshing once. */
      setSessionRefresher(refreshSession);
      app.onUnmount(() => {
        setSessionRefresher(null);
        clearRefreshTimer();
      });

      /* Restore an existing session on first load. */
      if (restoreSession) {
        void refreshSession().finally(() => {
          isLoading.value = false;
        });
      }
    },
  };
}

export function useAuth(): Auth {
  const auth = inject(AUTH_KEY, null);
  if (!auth) throw new Error('useAuth needs the auth plugin installed');
  return auth;
}
