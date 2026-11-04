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

/* ------------------------------------------- one-time e-mail links ---- */

export type EmailTokenPurpose = 'verify_email' | 'reset_password';

/**
 * Stores a new link token (only its hash) and retires any earlier unused one
 * for the same purpose, so only the newest e-mail's link works.
 */
export async function insertEmailToken(
  db: Sql,
  input: { userId: string; purpose: EmailTokenPurpose; tokenHash: string; expiresAt: Date },
): Promise<void> {
  await db.begin(async (tx) => {
    await tx`
      delete from email_tokens
      where user_id = ${input.userId} and purpose = ${input.purpose} and used_at is null
    `;
    await tx`
      insert into email_tokens (user_id, purpose, token_hash, expires_at)
      values (${input.userId}, ${input.purpose}, ${input.tokenHash}, ${input.expiresAt})
    `;
  });
}

/**
 * Uses up a link: returns whose it was, or null when it is unknown, already
 * used, expired or meant for something else. One statement, so the same link
 * cannot be used twice even by two clicks at once.
 */
export async function consumeEmailToken(
  db: Sql,
  tokenHash: string,
  purpose: EmailTokenPurpose,
): Promise<string | null> {
  const [row] = await db<{ userId: string }[]>`
    update email_tokens
    set used_at = now()
    where token_hash = ${tokenHash}
      and purpose = ${purpose}
      and used_at is null
      and expires_at > now()
    returning user_id as "userId"
  `;
  return row?.userId ?? null;
}
