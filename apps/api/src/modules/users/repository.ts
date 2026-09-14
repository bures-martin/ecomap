import type { CurrentUser, Role } from '@ecomap/shared';
import { permissionsForRole } from '@ecomap/shared';
import type { Sql } from '../../db/client.js';

export interface UserRow {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  role: Role;
  totpSecret: string | null;
  totpEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Every query selects the same aliased columns, so `UserRow` always matches. */
function userColumns(db: Sql) {
  return db`
    id,
    email,
    display_name  as "displayName",
    password_hash as "passwordHash",
    role,
    totp_secret   as "totpSecret",
    totp_enabled  as "totpEnabled",
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

export async function findUserByEmail(db: Sql, email: string): Promise<UserRow | null> {
  const [row] = await db<UserRow[]>`
    select ${userColumns(db)} from users where email = ${email}
  `;
  return row ?? null;
}

export async function insertUser(
  db: Sql,
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
    createdAt: row.createdAt,
  };
}
