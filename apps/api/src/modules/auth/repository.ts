import type { Sql } from '../../db/client.js';

export interface RefreshTokenRow {
  id: string;
  userId: string;
  expiresAt: string;
  revokedAt: string | null;
}

export async function insertRefreshToken(
  db: Sql,
  input: { userId: string; tokenHash: string; expiresAt: Date },
): Promise<void> {
  await db`
    insert into refresh_tokens (user_id, token_hash, expires_at)
    values (${input.userId}, ${input.tokenHash}, ${input.expiresAt})
  `;
}

/** Finds a token that is neither expired nor revoked. */
export async function findActiveRefreshToken(
  db: Sql,
  tokenHash: string,
): Promise<RefreshTokenRow | null> {
  const [row] = await db<RefreshTokenRow[]>`
    select
      id,
      user_id    as "userId",
      expires_at as "expiresAt",
      revoked_at as "revokedAt"
    from refresh_tokens
    where token_hash = ${tokenHash}
      and revoked_at is null
      and expires_at > now()
  `;
  return row ?? null;
}

export async function revokeRefreshToken(db: Sql, tokenHash: string): Promise<void> {
  await db`
    update refresh_tokens set revoked_at = now()
    where token_hash = ${tokenHash} and revoked_at is null
  `;
}

/** Used when a password changes: every other session should end. */
export async function revokeAllRefreshTokensForUser(db: Sql, userId: string): Promise<void> {
  await db`
    update refresh_tokens set revoked_at = now()
    where user_id = ${userId} and revoked_at is null
  `;
}

/** Housekeeping so the table does not grow without bound. */
export async function deleteExpiredRefreshTokens(db: Sql): Promise<number> {
  const rows = await db`
    delete from refresh_tokens
    where expires_at < now() - interval '30 days'
    returning id
  `;
  return rows.length;
}
