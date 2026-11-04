import type { Permission, Role } from '@ecomap/shared';
import { hasPermission, needsTwoFactor } from '@ecomap/shared';
import type { Request } from 'express';
import { ApiError } from '../http/api-error.js';

/** What the API knows about the caller, decoded from their access token. */
export interface AuthContext {
  userId: string;
  role: Role;
  /** Read from the database on each request, so turning it on counts at once. */
  totpEnabled: boolean;
}

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by `authenticate`; present only for signed-in callers. */
    auth?: AuthContext;
  }
}

/**
 * The caller's identity, or a 401.
 *
 * Route handlers call this instead of reading `req.auth` directly, so the
 * non-null assertion lives in exactly one place.
 */
export function requireAuthContext(req: Request): AuthContext {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth;
}

/** The caller's identity, or `null` for anonymous visitors. */
export function optionalAuthContext(req: Request): AuthContext | null {
  return req.auth ?? null;
}

/** Admins need two-factor sign-in for their admin powers (see `needsTwoFactor`). */
export function permissionError(auth: AuthContext, permission: Permission): ApiError | null {
  if (!hasPermission(auth.role, permission)) return ApiError.forbidden();
  if (needsTwoFactor(auth.role, permission) && !auth.totpEnabled) {
    return ApiError.totpSetupRequired();
  }
  return null;
}

export function assertPermission(req: Request, permission: Permission): AuthContext {
  const auth = requireAuthContext(req);
  const error = permissionError(auth, permission);
  if (error) throw error;
  return auth;
}
