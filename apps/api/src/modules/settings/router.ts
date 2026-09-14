import { updateCommunitySettingsInputSchema } from '@ecomap/shared';
import { Router } from 'express';
import { assertPermission } from '../../auth/context.js';
import type { Sql } from '../../db/client.js';
import { parseOrThrow } from '../../http/api-error.js';
import { writeRateLimiter } from '../../http/rate-limit.js';
import { getCommunitySettings, updateCommunitySettings } from './repository.js';

export function createSettingsRouter(db: Sql): Router {
  const router = Router();

  /* Public: the web app needs the name, colours and start position before login. */
  router.get('/', async (_req, res) => {
    res.json(await getCommunitySettings(db));
  });

  router.patch('/', writeRateLimiter, async (req, res) => {
    assertPermission(req, 'settings:manage');
    const input = parseOrThrow(updateCommunitySettingsInputSchema, req.body);
    res.json(await updateCommunitySettings(db, input));
  });

  return router;
}
