import { hasPermission, type Permission } from '@ecomap/shared';
import type { RequestHandler } from 'express';
import { ApiError } from '../http/api-error.js';
import { verifyAccessToken } from './tokens.js';

/**
 * Decodes `Authorization: Bearer <jwt>` when present.
 *
 * Always continues: endpoints that are readable by anonymous visitors still want
 * to know who is asking (to show their own drafts, for instance). Enforcement is
 * `requireAuth` / `requirePermission`, or an explicit check in the handler.
 *
 * The role travels inside the token, so an authenticated request costs no query.
 * The trade-off is that a role change only takes effect at the next refresh,
 * which is at most `ACCESS_TOKEN_TTL` (15 minutes by default).
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.header('authorization');
  if (!header?.toLowerCase().startsWith('bearer ')) {
    next();
    return;
  }

  const claims = await verifyAccessToken(header.slice('bearer '.length).trim());
  if (claims) {
    req.auth = claims;
  }
  next();
};

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
    if (!hasPermission(req.auth.role, permission)) {
      next(ApiError.forbidden());
      return;
    }
    next();
  };
}
