import {
  FEATURE_IMAGE_MAX_BYTES,
  IMAGE_CONTENT_TYPES,
  createFeatureInputSchema,
  featureImageQuerySchema,
  featureQuerySchema,
  hasPermission,
  moderateFeatureInputSchema,
  suggestFeatureInputSchema,
  toFeatureCollection,
  updateFeatureImageInputSchema,
  updateFeatureInputSchema,
} from '@ecomap/shared';
import express, { Router } from 'express';
import { z } from 'zod';
import { assertPermission, optionalAuthContext, requireAuthContext } from '../../auth/context.js';
import { requireAuth } from '../../auth/middleware.js';
import type { Sql } from '../../db/client.js';
import { ApiError, parseOrThrow } from '../../http/api-error.js';
import { writeRateLimiter } from '../../http/rate-limit.js';
import { findLayerIdsBySlugs } from '../layers/repository.js';
import { findFeatureImage } from './images.repository.js';
import { findFeatureById, listFeatures } from './repository.js';
import { suggestEdit } from '../suggestions/service.js';
import * as service from './service.js';

const idParamSchema = z.object({ id: z.uuid() });
const imageParamSchema = z.object({ id: z.uuid(), imageId: z.uuid() });

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
    if (!feature || !service.canViewFeature(optionalAuthContext(req), feature)) {
      throw ApiError.notFound('That contribution');
    }
    res.json(feature);
  });

  /*
   * Photos. They are served only to people who may see the contribution: a
   * published one's photos to everybody (and cacheable), the rest only to the
   * author and moderators, never cached by shared caches. `sandbox` means even
   * a crafted file opened directly can run nothing.
   */
  router.get('/:id/images/:imageId', async (req, res) => {
    const { id, imageId } = parseOrThrow(imageParamSchema, req.params);
    const feature = await findFeatureById(db, id);
    if (!feature || !service.canViewFeature(optionalAuthContext(req), feature)) {
      throw ApiError.notFound('That photo');
    }
    const image = await findFeatureImage(db, id, imageId);
    if (!image) throw ApiError.notFound('That photo');

    res
      .status(200)
      .set({
        'Content-Type': image.contentType,
        'Content-Length': String(image.data.length),
        'Cache-Control':
          feature.status === 'published' ? 'public, max-age=86400' : 'private, no-store',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      })
      .end(image.data);
  });

  router.post(
    '/:id/images',
    writeRateLimiter,
    requireAuth,
    express.raw({ type: [...IMAGE_CONTENT_TYPES], limit: FEATURE_IMAGE_MAX_BYTES }),
    async (req, res) => {
      const auth = requireAuthContext(req);
      const { id } = parseOrThrow(idParamSchema, req.params);
      const { alt } = parseOrThrow(featureImageQuerySchema, req.query);
      const body: unknown = req.body;
      if (!Buffer.isBuffer(body) || body.length === 0) {
        throw ApiError.badRequest('Upload the photo as a PNG, JPEG or WebP image');
      }
      res.status(201).json(await service.addFeatureImage(db, auth, id, body, alt));
    },
  );

  router.patch('/:id/images/:imageId', writeRateLimiter, requireAuth, async (req, res) => {
    const auth = requireAuthContext(req);
    const { id, imageId } = parseOrThrow(imageParamSchema, req.params);
    const { alt } = parseOrThrow(updateFeatureImageInputSchema, req.body);
    res.json(await service.updateFeatureImage(db, auth, id, imageId, alt));
  });

  router.delete('/:id/images/:imageId', writeRateLimiter, requireAuth, async (req, res) => {
    const auth = requireAuthContext(req);
    const { id, imageId } = parseOrThrow(imageParamSchema, req.params);
    res.json(await service.removeFeatureImage(db, auth, id, imageId));
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

  /* A member's suggested change; the place stays as it is until a moderator approves. */
  router.post('/:id/suggestions', writeRateLimiter, requireAuth, async (req, res) => {
    const auth = assertPermission(req, 'feature:suggest');
    const { id } = parseOrThrow(idParamSchema, req.params);
    const input = parseOrThrow(suggestFeatureInputSchema, req.body);
    res.status(201).json(await suggestEdit(db, auth, id, input));
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
