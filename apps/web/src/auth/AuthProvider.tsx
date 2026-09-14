import {
  hasPermission,
  type AuthSession,
  type CurrentUser,
  type LoginInput,
  type Permission,
  type RegisterInput,
} from '@ecomap/shared';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { setAccessToken, setSessionRefresher } from '../api/client.js';
import { authApi } from '../api/endpoints.js';

/**
 * Session handling.
 *
 * The access token is held in memory only. On a page load we ask the API to
 * refresh using the httpOnly cookie, which restores the session without ever
 * putting a credential somewhere a script could read it.
 */

export interface AuthContextValue {
  user: CurrentUser | null;
  /** True until the initial refresh attempt has settled. */
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/** Refresh this many seconds before the token actually expires. */
const REFRESH_SKEW_SECONDS = 60;
const MINIMUM_REFRESH_DELAY_SECONDS = 30;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Breaks the cycle between "schedule a refresh" and "the refresh function":
   * the timer reads the current implementation out of the ref when it fires.
   */
  const scheduledRefresh = useRef<() => Promise<string | null>>(() => Promise.resolve(null));

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimer.current !== null) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  const applySession = useCallback(
    (session: AuthSession) => {
      setAccessToken(session.accessToken);
      setUser(session.user);

      clearRefreshTimer();
      const delaySeconds = Math.max(
        session.expiresIn - REFRESH_SKEW_SECONDS,
        MINIMUM_REFRESH_DELAY_SECONDS,
      );
      refreshTimer.current = setTimeout(() => {
        void scheduledRefresh.current();
      }, delaySeconds * 1000);
    },
    [clearRefreshTimer],
  );

  const clearSession = useCallback(() => {
    clearRefreshTimer();
    setAccessToken(null);
    setUser(null);
  }, [clearRefreshTimer]);

  /**
   * Exchanges the refresh cookie for a new access token, and hands the token
   * back so the API client can retry the request that triggered it.
   */
  const refreshSession = useCallback(async (): Promise<string | null> => {
    try {
      const session = await authApi.refresh();
      applySession(session);
      return session.accessToken;
    } catch {
      clearSession();
      return null;
    }
  }, [applySession, clearSession]);

  useEffect(() => {
    scheduledRefresh.current = refreshSession;
    /* Let the API client recover from a 401 by refreshing once. */
    setSessionRefresher(refreshSession);
    return () => {
      setSessionRefresher(null);
    };
  }, [refreshSession]);

  /* Restore an existing session on first load. */
  useEffect(() => {
    let cancelled = false;
    void refreshSession().finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  useEffect(() => clearRefreshTimer, [clearRefreshTimer]);

  const login = useCallback(
    async (input: LoginInput) => {
      applySession(await authApi.login(input));
      await queryClient.invalidateQueries();
    },
    [applySession, queryClient],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      applySession(await authApi.register(input));
      await queryClient.invalidateQueries();
    },
    [applySession, queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
      /* Drop everything cached: what a signed-out visitor may see is different. */
      queryClient.clear();
    }
  }, [clearSession, queryClient]);

  const reloadUser = useCallback(async () => {
    try {
      setUser(await authApi.me());
    } catch {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login,
      register,
      logout,
      reloadUser,
      can: (permission: Permission) => hasPermission(user?.role, permission),
    }),
    [user, isLoading, login, register, logout, reloadUser],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
