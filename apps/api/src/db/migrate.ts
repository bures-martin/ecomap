import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createSql, type Sql } from './client.js';
import { env } from '../env.js';
import { logger } from '../logger.js';
import { isMainModule } from '../lib/main-module.js';

/**
 * A deliberately small migration runner: numbered `.sql` files, applied in order,
 * each inside its own transaction, recorded in `schema_migrations`.
 *
 * PostGIS columns and GiST/trigram indexes are awkward to express through an ORM
 * migration DSL, and plain SQL is the thing we would end up reading anyway.
 */

const MIGRATIONS_URL = new URL('../../migrations/', import.meta.url);

export async function migrate(db: Sql): Promise<string[]> {
  await db`
    create table if not exists schema_migrations (
      name       text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const files = (await readdir(fileURLToPath(MIGRATIONS_URL)))
    .filter((name) => name.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const applied = await db<{ name: string }[]>`select name from schema_migrations`;
  const appliedNames = new Set(applied.map((row) => row.name));

  const ran: string[] = [];
  for (const file of files) {
    if (appliedNames.has(file)) continue;

    const statements = await readFile(new URL(file, MIGRATIONS_URL), 'utf8');
    await db.begin(async (tx) => {
      await tx.unsafe(statements);
      await tx`insert into schema_migrations (name) values (${file})`;
    });

    ran.push(file);
    logger.info({ migration: file }, 'Applied migration');
  }

  return ran;
}

/** Entry point for `npm run db:migrate`. */
async function main(): Promise<void> {
  const db = createSql(env.DATABASE_URL);
  try {
    const ran = await migrate(db);
    logger.info(
      ran.length > 0 ? `Applied ${ran.length} migration(s)` : 'Database already up to date',
    );
  } finally {
    await db.end({ timeout: 5 });
  }
}

if (isMainModule(import.meta.url)) {
  main().catch((error: unknown) => {
    logger.error({ err: error }, 'Migration failed');
    process.exitCode = 1;
  });
}
