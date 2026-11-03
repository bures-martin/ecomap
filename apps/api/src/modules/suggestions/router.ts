import { decideSuggestionInputSchema, suggestionStatusSchema } from '@ecomap/shared';
import { Router } from 'express';
import { z } from 'zod';
import { assertPermission } from '../../auth/context.js';
import type { Sql } from '../../db/client.js';
import { parseOrThrow } from '../../http/api-error.js';
import { writeRateLimiter } from '../../http/rate-limit.js';
import { listSuggestions } from './repository.js';
import * as service from './service.js';

const idParamSchema = z.object({ id: z.uuid() });
const listQuerySchema = z.object({ status: suggestionStatusSchema.default('pending') });

/**
 * The moderators' side of suggested changes: the queue, and the decision.
 * Members send suggestions to `POST /api/features/:id/suggestions`.
 */
export function createSuggestionsRouter(db: Sql): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    assertPermission(req, 'feature:moderate');
    const { status } = parseOrThrow(listQuerySchema, req.query);
    res.json(await listSuggestions(db, status));
  });

  router.post('/:id/decide', writeRateLimiter, async (req, res) => {
    const auth = assertPermission(req, 'feature:moderate');
    const { id } = parseOrThrow(idParamSchema, req.params);
    const input = parseOrThrow(decideSuggestionInputSchema, req.body);
    res.json(await service.decideSuggestion(db, auth, id, input));
  });

  return router;
}
