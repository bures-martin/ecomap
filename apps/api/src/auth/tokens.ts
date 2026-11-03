import { createHash, randomBytes } from 'node:crypto';
import { roleSchema, type Role } from '@ecomap/shared';
import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';
import { accessTokenTtlSeconds, env } from '../env.js';

/**
 * Two token types, on purpose:
 *
 * - The **access token** is a short-lived JWT the browser keeps in memory and
 *   sends as `Authorization: Bearer`. Because it never travels in a cookie, the
 *   authenticated endpoints are structurally immune to CSRF.
 * - The **refresh token** is a long-lived opaque random string in an httpOnly,
 *   SameSite=Strict cookie scoped to `/api/auth`. Only the refresh endpoint sees
 *   it, and the database stores only its SHA-256 hash.
 */

const ISSUER = 'ecomap';
const AUDIENCE = 'ecomap-web';

const secretKey = new TextEncoder().encode(env.JWT_SECRET);

export interface AccessTokenClaims {
  userId: string;
  role: Role;
}

const accessClaimsSchema = z.object({
  sub: z.uuid(),
  role: roleSchema,
});

export async function signAccessToken(claims: AccessTokenClaims): Promise<string> {
  return new SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(env.ACCESS_TOKEN_TTL)
    .sign(secretKey);
}

/** Returns the claims, or `null` for any token that is invalid, expired or foreign. */
export async function verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    });

    const claims = accessClaimsSchema.safeParse(payload);
    if (!claims.success) return null;

    return { userId: claims.data.sub, role: claims.data.role };
  } catch {
    return null;
  }
}

export interface RefreshToken {
  /** Sent to the client; never stored. */
  token: string;
  /** Stored in the database; useless to an attacker who reads the table. */
  hash: string;
  expiresAt: Date;
}

export function createRefreshToken(): RefreshToken {
  const token = randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  return { token, hash: hashRefreshToken(token), expiresAt };
}

/**
 * Plain SHA-256 rather than a slow hash: the token is 48 random bytes, so there
 * is no dictionary to run against it and lookups happen on every refresh.
 */
export function hashRefreshToken(token: string): string {
  return hashOpaqueToken(token);
}

/** A random, URL-safe secret, such as the one in an invitation link, and its hash. */
export function createOpaqueToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashOpaqueToken(token) };
}

/** SHA-256 is enough for long random tokens: there is no dictionary to try. */
export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const REFRESH_COOKIE_NAME = 'ecomap_refresh';
export const REFRESH_COOKIE_PATH = '/api/auth';

export { accessTokenTtlSeconds };
