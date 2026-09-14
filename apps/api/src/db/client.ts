import postgres from 'postgres';
import { env, isTest } from '../env.js';

/**
 * `postgres.js` tagged templates parameterise every interpolated value, so the
 * SQL in the repositories stays readable while remaining injection-safe.
 */
export type Sql = postgres.Sql<{ timestamptz: string }>;

export function createSql(connectionString: string): Sql {
  return postgres(connectionString, {
    max: isTest ? 2 : 10,
    idle_timeout: 20,
    /* Timestamps cross the API boundary as ISO strings, never as Date objects. */
    types: {
      timestamptz: {
        to: 1184,
        from: [1184],
        serialize: (value: Date | string) => (value instanceof Date ? value.toISOString() : value),
        parse: (value: string) => new Date(value).toISOString(),
      },
    },
    onnotice: () => {
      /* Migration notices ("relation already exists, skipping") are not errors. */
    },
  });
}

export const sql: Sql = createSql(env.DATABASE_URL);

export async function closeSql(instance: Sql = sql): Promise<void> {
  await instance.end({ timeout: 5 });
}
