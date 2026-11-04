import type { Feature } from '@ecomap/shared';
import { Router } from 'express';
import { z } from 'zod';
import { assertPermission } from '../../auth/context.js';
import type { Sql } from '../../db/client.js';
import { parseOrThrow } from '../../http/api-error.js';
import { listFeatures } from '../features/repository.js';
import { listLayers } from '../layers/repository.js';
import { toCsv, toGeoJson } from './format.js';

const querySchema = z.object({ format: z.enum(['geojson', 'csv']).default('geojson') });

/** Read in pages so a big map never needs one huge query. */
const PAGE = 1000;

/**
 * GET /api/export?format=geojson|csv - everything on the map, for admins:
 * published, pending, draft and rejected, on visible and hidden layers.
 * Sent as a file download, never cached.
 */
export function createExportRouter(db: Sql): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    assertPermission(req, 'settings:manage');
    const { format } = parseOrThrow(querySchema, req.query);

    const features: Feature[] = [];
    for (let offset = 0; ; offset += PAGE) {
      const page = await listFeatures(db, {
        layerIds: [],
        bbox: undefined,
        search: undefined,
        status: undefined,
        onlyMine: false,
        viewerId: null,
        canReadUnpublished: true,
        includeUnpublishedLayers: true,
        limit: PAGE,
        offset,
      });
      features.push(...page.features);
      if (page.features.length < PAGE) break;
    }

    const exportedAt = new Date().toISOString();
    const context = {
      layers: await listLayers(db, true),
      origin: `${req.protocol}://${req.get('host') ?? 'localhost'}`,
      exportedAt,
    };
    const date = exportedAt.slice(0, 10);

    res.set('Cache-Control', 'no-store');
    if (format === 'csv') {
      res
        .type('text/csv; charset=utf-8')
        .attachment(`ecomap-${date}.csv`)
        .send(toCsv(features, context));
    } else {
      res
        .type('application/geo+json; charset=utf-8')
        .attachment(`ecomap-${date}.geojson`)
        .send(JSON.stringify(toGeoJson(features, context), null, 2));
    }
  });

  return router;
}
