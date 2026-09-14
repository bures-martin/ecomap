import {
  changePasswordInputSchema,
  loginInputSchema,
  registerInputSchema,
  totpDisableInputSchema,
  totpEnableInputSchema,
} from '@ecomap/shared';
import { Router, type CookieOptions, type Response } from 'express';
import { requireAuthContext } from '../../auth/context.js';
import { requireAuth } from '../../auth/middleware.js';
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH, type RefreshToken } from '../../auth/tokens.js';
import type { Sql } from '../../db/client.js';
import { isProduction } from '../../env.js';
import { ApiError, parseOrThrow } from '../../http/api-error.js';
import { authRateLimiter } from '../../http/rate-limit.js';
import { findUserById, toCurrentUser } from '../users/repository.js';
import * as service from './service.js';

/**
 * Refresh cookie policy:
 * - `httpOnly` so no script can read it, even after an XSS.
 * - `sameSite: strict` plus a path of `/api/auth` so it is only ever attached to
 *   the refresh and logout endpoints - that is what makes the rest of the API
 *   CSRF-proof, since everything else authenticates with a header.
 */
function refreshCookieOptions(expires: Date): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    expires,
  };
}

function setRefreshCookie(res: Response, token: RefreshToken): void {
  res.cookie(REFRESH_COOKIE_NAME, token.token, refreshCookieOptions(token.expiresAt));
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
}

export function createAuthRouter(db: Sql): Router {
  const router = Router();

  router.post('/register', authRateLimiter, async (req, res) => {
    const input = parseOrThrow(registerInputSchema, req.body);
    const { session, refreshToken } = await service.register(db, input);
    setRefreshCookie(res, refreshToken);
    res.status(201).json(session);
  });

  router.post('/login', authRateLimiter, async (req, res) => {
    const input = parseOrThrow(loginInputSchema, req.body);
    const { session, refreshToken } = await service.login(db, input);
    setRefreshCookie(res, refreshToken);
    res.json(session);
  });

  router.post('/refresh', async (req, res) => {
    const presented = readRefreshCookie(req.cookies);
    if (!presented) throw ApiError.unauthorized('No session to refresh');

    const { session, refreshToken } = await service.refresh(db, presented);
    setRefreshCookie(res, refreshToken);
    res.json(session);
  });

  router.post('/logout', async (req, res) => {
    await service.logout(db, readRefreshCookie(req.cookies));
    clearRefreshCookie(res);
    res.status(204).send();
  });

  router.get('/me', requireAuth, async (req, res) => {
    const { userId } = requireAuthContext(req);
    const user = await findUserById(db, userId);
    if (!user) throw ApiError.unauthorized();
    res.json(toCurrentUser(user));
  });

  router.post('/me/password', requireAuth, async (req, res) => {
    const { userId } = requireAuthContext(req);
    const input = parseOrThrow(changePasswordInputSchema, req.body);
    await service.changePassword(db, userId, input);
    clearRefreshCookie(res);
    res.status(204).send();
  });

  router.post('/me/totp/setup', requireAuth, async (req, res) => {
    const { userId } = requireAuthContext(req);
    res.json(await service.startTotpSetup(db, userId));
  });

  router.post('/me/totp/enable', requireAuth, async (req, res) => {
    const { userId } = requireAuthContext(req);
    const input = parseOrThrow(totpEnableInputSchema, req.body);
    await service.confirmTotpSetup(db, userId, input.code);
    res.status(204).send();
  });

  router.post('/me/totp/disable', requireAuth, async (req, res) => {
    const { userId } = requireAuthContext(req);
    const input = parseOrThrow(totpDisableInputSchema, req.body);
    await service.disableTotp(db, userId, input.password);
    res.status(204).send();
  });

  return router;
}

/** `cookie-parser` types cookies as `any`; narrow it once, here. */
function readRefreshCookie(cookies: unknown): string | undefined {
  if (typeof cookies !== 'object' || cookies === null) return undefined;
  const value = (cookies as Record<string, unknown>)[REFRESH_COOKIE_NAME];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
