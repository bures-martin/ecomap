import {
  createFeatureInputSchema,
  featureQuerySchema,
  hasPermission,
  moderateFeatureInputSchema,
  toFeatureCollection,
  updateFeatureInputSchema,
} from '@ecomap/shared';
import { Router } from 'express';
import { z } from 'zod';
import { assertPermission, optionalAuthContext, requireAuthContext } from '../../auth/context.js';
import { requireAuth } from '../../auth/middleware.js';
import type { Sql } from '../../db/client.js';
import { ApiError, parseOrThrow } from '../../http/api-error.js';
import { writeRateLimiter } from '../../http/rate-limit.js';
import { findLayerIdsBySlugs } from '../layers/repository.js';
import { findFeatureById, listFeatures } from './repository.js';
import * as service from './service.js';

const idParamSchema = z.object({ id: z.uuid() });

export function createFeaturesRouter(db: Sql): Router {
  const router = Router();

  /**
   * Returns GeoJSON, which every map library consumes directly. Filters come
   * from the query string so a filtered map is a shareable URL.
   */
  router.get('/', async (req, res) => {
    const query = parseOrThrow(featureQuerySchema, req.query);
    const auth = optionalAuthContext(req);
    const canReadUnpublished = hasPermission(auth?.role, 'feature:read:unpublished');

    /*
     * Unknown slugs must not widen the result set: if the caller asked for
     * layers and none of them resolved, answer with nothing rather than
     * everything.
     */
    const layerIds = query.layers.length > 0 ? await findLayerIdsBySlugs(db, query.layers) : [];
    if (query.layers.length > 0 && layerIds.length === 0) {
      res.json(toFeatureCollection([], 0));
      return;
    }

    const { features, total } = await listFeatures(db, {
      layerIds,
      bbox: query.bbox,
      search: query.q,
      status: query.status,
      onlyMine: query.mine,
      viewerId: auth?.userId ?? null,
      canReadUnpublished,
      includeUnpublishedLayers: hasPermission(auth?.role, 'layer:read:unpublished'),
      limit: query.limit,
      offset: query.offset,
    });

    res.json(toFeatureCollection(features, total));
  });

  router.get('/:id', async (req, res) => {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const feature = await findFeatureById(db, id);
    if (!feature) throw ApiError.notFound('That contribution');

    const auth = optionalAuthContext(req);
    const visible =
      feature.status === 'published' ||
      hasPermission(auth?.role, 'feature:read:unpublished') ||
      (auth !== null && feature.createdById === auth.userId);

    if (!visible) throw ApiError.notFound('That contribution');
    res.json(feature);
  });

  router.post('/', writeRateLimiter, requireAuth, async (req, res) => {
    const auth = assertPermission(req, 'feature:create');
    const input = parseOrThrow(createFeatureInputSchema, req.body);
    res.status(201).json(await service.createFeature(db, auth, input));
  });

  router.patch('/:id', writeRateLimiter, requireAuth, async (req, res) => {
    const auth = requireAuthContext(req);
    const { id } = parseOrThrow(idParamSchema, req.params);
    const input = parseOrThrow(updateFeatureInputSchema, req.body);
    res.json(await service.editFeature(db, auth, id, input));
  });

  router.delete('/:id', writeRateLimiter, requireAuth, async (req, res) => {
    const auth = requireAuthContext(req);
    const { id } = parseOrThrow(idParamSchema, req.params);
    await service.removeFeature(db, auth, id);
    res.status(204).send();
  });

  router.post('/:id/moderate', writeRateLimiter, async (req, res) => {
    const auth = assertPermission(req, 'feature:moderate');
    const { id } = parseOrThrow(idParamSchema, req.params);
    const input = parseOrThrow(moderateFeatureInputSchema, req.body);
    res.json(await service.moderateFeature(db, auth, id, input));
  });

  return router;
}
