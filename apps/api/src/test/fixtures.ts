import {
  createLayerInputSchema,
  type CreateLayerInputDraft,
  type Layer,
  type Role,
} from '@ecomap/shared';
import type { Express } from 'express';
import request from 'supertest';
import { hashPassword } from '../auth/password.js';
import type { Sql } from '../db/client.js';
import { insertLayer } from '../modules/layers/repository.js';
import { insertUser } from '../modules/users/repository.js';
import { signAccessToken } from '../auth/tokens.js';

export const TEST_PASSWORD = 'a-long-enough-passw0rd';

export interface TestUser {
  id: string;
  email: string;
  role: Role;
  accessToken: string;
  /** Ready-to-spread supertest header, e.g. `.set(user.authHeader)`. */
  authHeader: { Authorization: string };
}

let userCounter = 0;

export async function createTestUser(
  db: Sql,
  role: Role = 'contributor',
  overrides: { email?: string; password?: string } = {},
): Promise<TestUser> {
  userCounter += 1;
  const email = overrides.email ?? `user${userCounter}@example.test`;

  const row = await insertUser(db, {
    email,
    displayName: `Test user ${userCounter}`,
    passwordHash: await hashPassword(overrides.password ?? TEST_PASSWORD),
    role,
  });

  const accessToken = await signAccessToken({ userId: row.id, role: row.role });

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    accessToken,
    authHeader: { Authorization: `Bearer ${accessToken}` },
  };
}

export async function createTestLayer(
  db: Sql,
  overrides: Partial<CreateLayerInputDraft> = {},
): Promise<Layer> {
  const input = createLayerInputSchema.parse({
    slug:
      overrides.slug ?? `layer-${String(Date.now())}-${String(Math.floor(Math.random() * 1e6))}`,
    name: 'Test layer',
    ...overrides,
  });
  return insertLayer(db, input, null);
}

/** Extracts the refresh cookie supertest saw, so tests can replay it. */
export function refreshCookieFrom(response: request.Response): string | undefined {
  /* Supertest types headers as `any`; narrow it here rather than at every call. */
  const header: unknown = response.headers['set-cookie'];
  const cookies: string[] = Array.isArray(header)
    ? header.filter((value): value is string => typeof value === 'string')
    : typeof header === 'string'
      ? [header]
      : [];
  return cookies.find((cookie) => cookie.startsWith('ecomap_refresh='));
}

export function agentFor(app: Express): request.Agent {
  return request.agent(app);
}
