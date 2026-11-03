import { createInvitationInputSchema } from '@ecomap/shared';
import { Router } from 'express';
import { z } from 'zod';
import { assertPermission } from '../../auth/context.js';
import type { Sql } from '../../db/client.js';
import { parseOrThrow } from '../../http/api-error.js';
import { writeRateLimiter } from '../../http/rate-limit.js';
import { listInvitations, toInvitation } from './repository.js';
import * as service from './service.js';

const idParamSchema = z.object({ id: z.uuid() });

/**
 * Managing invitations, for admins. Accepting one is public and lives with the
 * rest of sign-in, under `/api/auth/invitations`, because it sets the session
 * cookie.
 */
export function createInvitationsRouter(db: Sql): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    assertPermission(req, 'user:invite');
    const rows = await listInvitations(db);
    res.json(rows.map(toInvitation));
  });

  router.post('/', writeRateLimiter, async (req, res) => {
    const actor = assertPermission(req, 'user:invite');
    const input = parseOrThrow(createInvitationInputSchema, req.body);
    res.status(201).json(await service.createInvitation(db, actor, input));
  });

  router.delete('/:id', writeRateLimiter, async (req, res) => {
    const actor = assertPermission(req, 'user:invite');
    const { id } = parseOrThrow(idParamSchema, req.params);
    await service.revoke(db, actor, id);
    res.status(204).send();
  });

  return router;
}
