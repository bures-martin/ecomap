import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    /* `env.ts` branches on NODE_ENV: silent logs, smaller pool, no rate limiting. */
    env: { NODE_ENV: 'test' },
    /*
     * Integration tests share one PostgreSQL database and truncate between
     * cases, so they must not run concurrently with each other.
     */
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
