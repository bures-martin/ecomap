import { updateCommunitySettingsInputSchema } from '@ecomap/shared';
import { Router } from 'express';
import { assertPermission } from '../../auth/context.js';
import type { Sql } from '../../db/client.js';
import { ApiError, parseOrThrow } from '../../http/api-error.js';
import { writeRateLimiter } from '../../http/rate-limit.js';
import { checkAreaValidity, getCommunitySettings, updateCommunitySettings } from './repository.js';

export function createSettingsRouter(db: Sql): Router {
  const router = Router();

  /* Public: the web app needs the name, colours, start position and area before login. */
  router.get('/', async (_req, res) => {
    res.json(await getCommunitySettings(db));
  });

  router.patch('/', writeRateLimiter, async (req, res) => {
    assertPermission(req, 'settings:manage');
    const input = parseOrThrow(updateCommunitySettingsInputSchema, req.body);

    if (input.contributionArea) {
      const { valid, reason } = await checkAreaValidity(db, input.contributionArea);
      if (!valid) {
        throw new ApiError('validation_failed', 'The area outline is not a valid shape', [
          { path: 'contributionArea', message: reason },
        ]);
      }
    }

    res.json(await updateCommunitySettings(db, input));
  });

  return router;
}
