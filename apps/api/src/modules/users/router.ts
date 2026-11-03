import { isAtLeast, updateUserRoleInputSchema } from '@ecomap/shared';
import { Router } from 'express';
import { z } from 'zod';
import { assertPermission } from '../../auth/context.js';
import type { Sql } from '../../db/client.js';
import { ApiError, parseOrThrow } from '../../http/api-error.js';
import { writeRateLimiter } from '../../http/rate-limit.js';
import {
  findUserAvatar,
  findUserById,
  listUsers,
  toCurrentUser,
  updateUserRole,
} from './repository.js';

const idParamSchema = z.object({ id: z.uuid() });

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export function createUsersRouter(db: Sql): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    assertPermission(req, 'user:manage');
    const { limit, offset } = parseOrThrow(listQuerySchema, req.query);
    const users = await listUsers(db, limit, offset);
    res.json(users.map(toCurrentUser));
  });

  /*
   * Public, like the display names already shown on contributions. The URL
   * carries a version, so a cached copy is never stale. It is still cached for
   * a day only, not forever: a removed picture should not linger for long in
   * the browsers of everybody who once saw it.
   * `default-src 'none'` plus `sandbox` mean that even a crafted file that got
   * past the type check could run nothing when opened directly.
   */
  router.get('/:id/avatar', async (req, res) => {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const avatar = await findUserAvatar(db, id);
    if (!avatar) throw ApiError.notFound('That picture');

    res
      .status(200)
      .set({
        'Content-Type': avatar.contentType,
        'Content-Length': String(avatar.data.length),
        'Cache-Control': 'public, max-age=86400',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'Last-Modified': new Date(avatar.updatedAt).toUTCString(),
      })
      .end(avatar.data);
  });

  router.patch('/:id/role', writeRateLimiter, async (req, res) => {
    const actor = assertPermission(req, 'role:assign');
    const { id } = parseOrThrow(idParamSchema, req.params);
    const { role } = parseOrThrow(updateUserRoleInputSchema, req.body);

    const target = await findUserById(db, id);
    if (!target) throw ApiError.notFound('That account');

    /*
     * Two guard rails on the one action that can lock everybody out: a superadmin
     * cannot demote themselves, and cannot demote another superadmin.
     */
    if (target.id === actor.userId && !isAtLeast(role, 'superadmin')) {
      throw ApiError.badRequest('You cannot remove your own superadmin role');
    }
    if (target.role === 'superadmin' && target.id !== actor.userId) {
      throw ApiError.forbidden('Another superadmin has to change their own role');
    }

    const updated = await updateUserRole(db, id, role);
    if (!updated) throw ApiError.notFound('That account');
    res.json(toCurrentUser(updated));
  });

  return router;
}
