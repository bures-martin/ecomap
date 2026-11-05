import { createShortLinkInputSchema, shareableQuery, shortCodeSchema } from '@ecomap/shared';
import { Router } from 'express';
import { z } from 'zod';
import type { Sql } from '../../db/client.js';
import { ApiError, parseOrThrow } from '../../http/api-error.js';
import { writeRateLimiter } from '../../http/rate-limit.js';
import { findOrCreateShortLink, findShortLinkByCode } from './repository.js';

const codeParamSchema = z.object({ code: shortCodeSchema });

/**
 * Short links for sharing. Open to everyone, signed in or not: a visitor who
 * found a farm shop should be able to send it to a friend. What a link can
 * hold is limited to the map's own view (see `shareableQuery`), and creating
 * one counts against the write rate limit.
 */
export function createLinksRouter(db: Sql): Router {
  const router = Router();

  router.post('/', writeRateLimiter, async (req, res) => {
    const input = parseOrThrow(createShortLinkInputSchema, req.body);
    const query = shareableQuery(new URLSearchParams(input.query));
    res.status(201).json(await findOrCreateShortLink(db, query));
  });

  router.get('/:code', async (req, res) => {
    const { code } = parseOrThrow(codeParamSchema, req.params);
    const link = await findShortLinkByCode(db, code);
    if (!link) throw ApiError.notFound('That link');
    res.json(link);
  });

  return router;
}
