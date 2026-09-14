import { createApp } from './app.js';
import { closeSql, sql } from './db/client.js';
import { migrate } from './db/migrate.js';
import { env } from './env.js';
import { logger } from './logger.js';
import { deleteExpiredRefreshTokens } from './modules/auth/repository.js';

/** Clears long-dead refresh tokens once a day; failure here must not kill the API. */
const TOKEN_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function start(): Promise<void> {
  const applied = await migrate(sql);
  if (applied.length > 0) {
    logger.info({ migrations: applied }, 'Database schema updated');
  }

  const app = createApp(sql);
  const server = app.listen(env.PORT, () => {
    logger.info(`EcoMap API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const cleanup = setInterval(() => {
    deleteExpiredRefreshTokens(sql).catch((error: unknown) => {
      logger.warn({ err: error }, 'Refresh token cleanup failed');
    });
  }, TOKEN_CLEANUP_INTERVAL_MS);
  cleanup.unref();

  const shutdown = (signal: string): void => {
    logger.info({ signal }, 'Shutting down');
    clearInterval(cleanup);
    server.close(() => {
      void closeSql().finally(() => process.exit(0));
    });
    /* Do not wait forever for lingering keep-alive connections. */
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });
}

start().catch((error: unknown) => {
  logger.error({ err: error }, 'Failed to start the API');
  process.exit(1);
});
