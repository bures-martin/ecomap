import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { createAuthenticate } from './auth/middleware.js';
import type { Sql } from './db/client.js';
import { env, isTest } from './env.js';
import { errorHandler, notFoundHandler } from './http/error-handler.js';
import { apiRateLimiter } from './http/rate-limit.js';
import { logger } from './logger.js';
import { createAuthRouter } from './modules/auth/router.js';
import { createFeaturesRouter } from './modules/features/router.js';
import { createSuggestionsRouter } from './modules/suggestions/router.js';
import { createInvitationsRouter } from './modules/invitations/router.js';
import { createLayersRouter } from './modules/layers/router.js';
import { createSettingsRouter } from './modules/settings/router.js';
import { createUsersRouter } from './modules/users/router.js';

/**
 * Builds the Express application around a database handle.
 *
 * Taking `db` as an argument (rather than importing the singleton) is what lets
 * the integration tests run the whole stack against a throwaway database.
 */
export function createApp(db: Sql): Express {
  const app = express();

  /* Behind a reverse proxy, trust exactly one hop so rate limiting sees real IPs. */
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      /* The API serves JSON only; a strict CSP belongs on the web app's host. */
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );

  if (!isTest) {
    app.use(pinoHttp({ logger }));
  }

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(apiRateLimiter);
  app.use(createAuthenticate(db));

  app.get('/api/health', async (_req, res) => {
    await db`select 1`;
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.use('/api/auth', createAuthRouter(db));
  app.use('/api/layers', createLayersRouter(db));
  app.use('/api/features', createFeaturesRouter(db));
  app.use('/api/suggestions', createSuggestionsRouter(db));
  app.use('/api/settings', createSettingsRouter(db));
  app.use('/api/users', createUsersRouter(db));
  app.use('/api/invitations', createInvitationsRouter(db));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
