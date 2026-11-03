import type { AvatarContentType, CurrentUser, Role } from '@ecomap/shared';
import { avatarPath, permissionsForRole } from '@ecomap/shared';
import type { Queryable, Sql } from '../../db/client.js';

export interface UserRow {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  role: Role;
  totpSecret: string | null;
  totpEnabled: boolean;
  avatarUpdatedAt: string | null;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Every query selects the same aliased columns, so `UserRow` always matches. */
function userColumns(db: Queryable) {
  return db`
    id,
    email,
    display_name  as "displayName",
    password_hash as "passwordHash",
    role,
    totp_secret   as "totpSecret",
    totp_enabled  as "totpEnabled",
    avatar_updated_at as "avatarUpdatedAt",
    disabled_at   as "disabledAt",
    created_at    as "createdAt",
    updated_at    as "updatedAt"
  `;
}

export async function findUserById(db: Sql, id: string): Promise<UserRow | null> {
  const [row] = await db<UserRow[]>`
    select ${userColumns(db)} from users where id = ${id}
  `;
  return row ?? null;
}

export async function findUserByEmail(db: Queryable, email: string): Promise<UserRow | null> {
  const [row] = await db<UserRow[]>`
    select ${userColumns(db)} from users where email = ${email}
  `;
  return row ?? null;
}

export async function insertUser(
  db: Queryable,
  input: { email: string; displayName: string; passwordHash: string; role: Role },
): Promise<UserRow> {
  const [row] = await db<UserRow[]>`
    insert into users (email, display_name, password_hash, role)
    values (${input.email}, ${input.displayName}, ${input.passwordHash}, ${input.role})
    returning ${userColumns(db)}
  `;
  if (!row) throw new Error('Insert returned no row');
  return row;
}

export async function updateUserPassword(
  db: Sql,
  userId: string,
  passwordHash: string,
): Promise<void> {
  await db`update users set password_hash = ${passwordHash} where id = ${userId}`;
}

/** Stores a pending secret; two-factor stays off until a code is confirmed. */
export async function setUserTotpSecret(db: Sql, userId: string, secret: string): Promise<void> {
  await db`update users set totp_secret = ${secret}, totp_enabled = false where id = ${userId}`;
}

export async function enableUserTotp(db: Sql, userId: string): Promise<void> {
  await db`update users set totp_enabled = true where id = ${userId}`;
}

export async function disableUserTotp(db: Sql, userId: string): Promise<void> {
  await db`update users set totp_secret = null, totp_enabled = false where id = ${userId}`;
}

export async function updateUserRole(db: Sql, userId: string, role: Role): Promise<UserRow | null> {
  const [row] = await db<UserRow[]>`
    update users set role = ${role} where id = ${userId} returning ${userColumns(db)}
  `;
  return row ?? null;
}

export async function listUsers(db: Sql, limit = 200, offset = 0): Promise<UserRow[]> {
  return db<UserRow[]>`
    select ${userColumns(db)} from users
    order by created_at asc
    limit ${limit} offset ${offset}
  `;
}

export async function countUsers(db: Sql): Promise<number> {
  const [row] = await db<{ count: string }[]>`select count(*)::text as count from users`;
  return Number(row?.count ?? 0);
}

/** Shapes a row for the client, dropping the hash and expanding role to permissions. */
export function toCurrentUser(row: UserRow): CurrentUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role,
    permissions: [...permissionsForRole(row.role)],
    totpEnabled: row.totpEnabled,
    avatarUrl: row.avatarUpdatedAt ? avatarPath(row.id, row.avatarUpdatedAt) : null,
    disabled: row.disabledAt !== null,
    createdAt: row.createdAt,
  };
}

export interface AvatarRow {
  contentType: AvatarContentType;
  data: Buffer;
  updatedAt: string;
}

export async function findUserAvatar(db: Sql, userId: string): Promise<AvatarRow | null> {
  const [row] = await db<AvatarRow[]>`
    select content_type as "contentType", data, updated_at as "updatedAt"
    from user_avatars where user_id = ${userId}
  `;
  return row ?? null;
}

/** Stores or replaces the picture and bumps the version on the user row, atomically. */
export async function setUserAvatar(
  db: Sql,
  userId: string,
  contentType: AvatarContentType,
  data: Buffer,
): Promise<UserRow | null> {
  return db.begin(async (tx) => {
    const [avatar] = await tx<{ updatedAt: string }[]>`
      insert into user_avatars (user_id, content_type, data, updated_at)
      values (${userId}, ${contentType}, ${data}, now())
      on conflict (user_id) do update
        set content_type = excluded.content_type,
            data         = excluded.data,
            updated_at   = excluded.updated_at
      returning updated_at as "updatedAt"
    `;
    const [row] = await tx<UserRow[]>`
      update users set avatar_updated_at = ${avatar?.updatedAt ?? null}
      where id = ${userId}
      returning ${userColumns(tx)}
    `;
    return row ?? null;
  });
}

export async function deleteUserAvatar(db: Sql, userId: string): Promise<UserRow | null> {
  return db.begin(async (tx) => {
    await tx`delete from user_avatars where user_id = ${userId}`;
    const [row] = await tx<UserRow[]>`
      update users set avatar_updated_at = null
      where id = ${userId}
      returning ${userColumns(tx)}
    `;
    return row ?? null;
  });
}

/**
 * Whether the account behind a still-valid access token may act right now.
 * One primary-key lookup per authenticated request, so blocking takes effect
 * immediately instead of when the token expires.
 */
export async function isUserActive(db: Sql, userId: string): Promise<boolean> {
  const [row] = await db<{ disabled: boolean }[]>`
    select disabled_at is not null as disabled from users where id = ${userId}
  `;
  return row !== undefined && !row.disabled;
}

export async function setUserDisabled(
  db: Sql,
  userId: string,
  disabled: boolean,
): Promise<UserRow | null> {
  const [row] = await db<UserRow[]>`
    update users
    set disabled_at = ${disabled ? db`coalesce(disabled_at, now())` : null}
    where id = ${userId}
    returning ${userColumns(db)}
  `;
  return row ?? null;
}
