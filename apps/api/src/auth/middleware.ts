import type { Permission } from '@ecomap/shared';
import type { RequestHandler } from 'express';
import type { Sql } from '../db/client.js';
import { ApiError } from '../http/api-error.js';
import { findAccessState } from '../modules/users/repository.js';
import { permissionError } from './context.js';
import { verifyAccessToken } from './tokens.js';

/**
 * Decodes `Authorization: Bearer <jwt>` when present.
 *
 * Always continues: endpoints that are readable by anonymous visitors still want
 * to know who is asking (to show their own drafts, for instance). Enforcement is
 * `requireAuth` / `requirePermission`, or an explicit check in the handler.
 *
 * The role travels inside the token, so a role change only takes effect at the
 * next refresh - at most `ACCESS_TOKEN_TTL` (15 minutes by default). Blocking
 * cannot wait that long, so each authenticated request also makes one
 * primary-key lookup: a blocked account's token is ignored straight away, and
 * the caller is treated as signed out.
 */
export function createAuthenticate(db: Sql): RequestHandler {
  return async (req, _res, next) => {
    const header = req.header('authorization');
    if (!header?.toLowerCase().startsWith('bearer ')) {
      next();
      return;
    }

    const claims = await verifyAccessToken(header.slice('bearer '.length).trim());
    const state = claims ? await findAccessState(db, claims.userId) : null;
    if (claims && state) {
      req.auth = { ...claims, totpEnabled: state.totpEnabled };
    }
    next();
  };
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.auth) {
    next(ApiError.unauthorized());
    return;
  }
  next();
};

export function requirePermission(permission: Permission): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(ApiError.unauthorized());
      return;
    }
    next(permissionError(req.auth, permission) ?? undefined);
  };
}
