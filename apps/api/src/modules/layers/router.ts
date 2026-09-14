import { createLayerInputSchema, hasPermission, updateLayerInputSchema } from '@ecomap/shared';
import { Router } from 'express';
import { z } from 'zod';
import { assertPermission, optionalAuthContext } from '../../auth/context.js';
import type { Sql } from '../../db/client.js';
import { ApiError, parseOrThrow } from '../../http/api-error.js';
import { writeRateLimiter } from '../../http/rate-limit.js';
import {
  deleteLayer,
  findLayerById,
  findLayerBySlug,
  insertLayer,
  listLayers,
  updateLayer,
} from './repository.js';

const idParamSchema = z.object({ id: z.uuid() });

export function createLayersRouter(db: Sql): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const auth = optionalAuthContext(req);
    const includeUnpublished = hasPermission(auth?.role, 'layer:read:unpublished');
    res.json(await listLayers(db, includeUnpublished));
  });

  router.get('/:slug', async (req, res) => {
    const layer = await findLayerBySlug(db, req.params.slug);
    if (!layer) throw ApiError.notFound('That layer');

    const auth = optionalAuthContext(req);
    if (!layer.isPublished && !hasPermission(auth?.role, 'layer:read:unpublished')) {
      /* Do not reveal that an unpublished layer exists. */
      throw ApiError.notFound('That layer');
    }

    res.json(layer);
  });

  router.post('/', writeRateLimiter, async (req, res) => {
    const auth = assertPermission(req, 'layer:manage');
    const input = parseOrThrow(createLayerInputSchema, req.body);

    if (await findLayerBySlug(db, input.slug)) {
      throw ApiError.conflict(`A layer with the address "${input.slug}" already exists`);
    }

    res.status(201).json(await insertLayer(db, input, auth.userId));
  });

  router.patch('/:id', writeRateLimiter, async (req, res) => {
    assertPermission(req, 'layer:manage');
    const { id } = parseOrThrow(idParamSchema, req.params);
    const input = parseOrThrow(updateLayerInputSchema, req.body);

    const layer = await updateLayer(db, id, input);
    if (!layer) throw ApiError.notFound('That layer');
    res.json(layer);
  });

  router.delete('/:id', writeRateLimiter, async (req, res) => {
    assertPermission(req, 'layer:manage');
    const { id } = parseOrThrow(idParamSchema, req.params);

    const layer = await findLayerById(db, id);
    if (!layer) throw ApiError.notFound('That layer');

    /*
     * Deleting a layer cascades to its features, which is destructive enough to
     * warrant an explicit opt-in rather than a surprise.
     */
    const confirmed = req.query['confirm'] === 'true';
    if (layer.featureCount > 0 && !confirmed) {
      throw ApiError.conflict(
        `"${layer.name}" still holds ${layer.featureCount} contribution(s). ` +
          'Re-send with ?confirm=true to delete them as well.',
      );
    }

    await deleteLayer(db, id);
    res.status(204).send();
  });

  return router;
}
