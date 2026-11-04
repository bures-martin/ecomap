import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';
import { COMMUNITY_SLUGS } from './communities/index.js';

/**
 * The API reads its configuration once, here, and fails loudly at boot if
 * anything is missing or malformed. No `process.env` access anywhere else.
 */

loadDotenv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });

const durationSchema = z
  .string()
  .regex(/^\d+[smhd]$/, 'Use a duration such as 15m, 2h or 7d')
  .default('15m');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required - see .env.example'),
  TEST_DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL: durationSchema,
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
  SEED_ADMIN_EMAIL: z.string().default('admin@ecomap.local'),
  SEED_ADMIN_PASSWORD: z.string().default('ChangeMe123!'),
  SEED_ADMIN_NAME: z.string().default('EcoMap Admin'),
  /** Which community `npm run db:seed` writes into the database - see src/communities. */
  COMMUNITY: z.enum(COMMUNITY_SLUGS).default('neutral'),
  /**
   * The address people reach the site at - links in e-mails point here.
   * In development that is the Vite dev server.
   */
  PUBLIC_URL: z.url().default('http://localhost:5173'),
  /**
   * Outgoing e-mail (sign-up confirmation, password reset). Without SMTP_HOST
   * nothing is sent: the e-mail is written to the log instead, which is fine on
   * a laptop and makes the problem obvious on a server.
   */
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  /** true for port 465 (TLS from the start); false uses STARTTLS on 587. */
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().default('EcoMap <no-reply@localhost>'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

function readEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return parsed.data;
}

export const env: Env = readEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

/** Seconds, for the `expiresIn` we hand the client alongside an access token. */
export function accessTokenTtlSeconds(): number {
  const match = /^(\d+)([smhd])$/.exec(env.ACCESS_TOKEN_TTL);
  if (!match) throw new Error(`Unparsable ACCESS_TOKEN_TTL: ${env.ACCESS_TOKEN_TTL}`);
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86_400 };
  const multiplier = multipliers[unit ?? 's'] ?? 1;
  return amount * multiplier;
}
