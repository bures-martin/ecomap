import postgres from 'postgres';
import { createSql, type Sql } from '../db/client.js';
import { migrate } from '../db/migrate.js';
import { env } from '../env.js';

/**
 * Integration tests run against a real PostGIS database - the spatial queries
 * and the check constraints are most of what is worth testing, and neither
 * survives being mocked.
 *
 * The database named by `TEST_DATABASE_URL` is created on demand and migrated
 * once per run. Without that variable the integration suites skip themselves, so
 * `npm test` still passes on a machine with no Docker.
 */

export const TEST_DATABASE_URL = env.TEST_DATABASE_URL;
export const hasTestDatabase = Boolean(TEST_DATABASE_URL);

/** Connects to the `postgres` maintenance database to create the test database. */
async function ensureDatabaseExists(connectionString: string): Promise<void> {
  const url = new URL(connectionString);
  const databaseName = url.pathname.replace(/^\//, '');
  if (!databaseName) throw new Error('TEST_DATABASE_URL has no database name');

  const adminUrl = new URL(connectionString);
  adminUrl.pathname = '/postgres';

  const admin = postgres(adminUrl.toString(), { max: 1, onnotice: () => undefined });
  try {
    const existing = await admin<{ oid: number }[]>`
      select oid from pg_database where datname = ${databaseName}
    `;
    if (existing.length === 0) {
      /* Identifiers cannot be parameterised; `unsafe` with a validated name is the way. */
      if (!/^[a-zA-Z0-9_]+$/.test(databaseName)) {
        throw new Error(`Unsafe test database name: ${databaseName}`);
      }
      await admin.unsafe(`create database "${databaseName}"`);
    }
  } finally {
    await admin.end({ timeout: 5 });
  }
}

export async function setupTestDatabase(): Promise<Sql> {
  if (!TEST_DATABASE_URL) {
    throw new Error('setupTestDatabase called without TEST_DATABASE_URL');
  }

  await ensureDatabaseExists(TEST_DATABASE_URL);
  const db = createSql(TEST_DATABASE_URL);
  await migrate(db);
  return db;
}

/** Empties every table between tests, leaving the schema and the settings row. */
export async function resetTestDatabase(db: Sql): Promise<void> {
  await db`truncate table refresh_tokens, features, layers, users restart identity cascade`;
  await db`
    update community_settings
    set name = 'EcoMap Community',
        contribution_bounds = null,
        allow_public_registration = true
    where id = true
  `;
}

export async function teardownTestDatabase(db: Sql): Promise<void> {
  await db.end({ timeout: 5 });
}
