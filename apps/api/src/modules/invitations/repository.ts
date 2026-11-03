import type { Invitation, InvitationStatus, Role } from '@ecomap/shared';
import type { Queryable, Sql } from '../../db/client.js';

export interface InvitationRow {
  id: string;
  role: Role;
  label: string;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  acceptedByName: string | null;
  revokedAt: string | null;
}

function invitationColumns(db: Queryable) {
  return db`
    i.id,
    i.role,
    i.label,
    i.created_by   as "createdById",
    creator.display_name  as "createdByName",
    i.created_at   as "createdAt",
    i.expires_at   as "expiresAt",
    i.accepted_at  as "acceptedAt",
    acceptor.display_name as "acceptedByName",
    i.revoked_at   as "revokedAt"
  `;
}

function invitationJoins(db: Queryable) {
  return db`
    from invitations i
    left join users creator  on creator.id  = i.created_by
    left join users acceptor on acceptor.id = i.accepted_by
  `;
}

export async function insertInvitation(
  db: Sql,
  input: { tokenHash: string; role: Role; label: string; createdBy: string; expiresAt: Date },
): Promise<InvitationRow> {
  const [inserted] = await db<{ id: string }[]>`
    insert into invitations (token_hash, role, label, created_by, expires_at)
    values (${input.tokenHash}, ${input.role}, ${input.label}, ${input.createdBy}, ${input.expiresAt})
    returning id
  `;
  const row = inserted ? await findInvitationById(db, inserted.id) : null;
  if (!row) throw new Error('Insert returned no row');
  return row;
}

export async function findInvitationById(db: Queryable, id: string): Promise<InvitationRow | null> {
  const [row] = await db<InvitationRow[]>`
    select ${invitationColumns(db)} ${invitationJoins(db)} where i.id = ${id}
  `;
  return row ?? null;
}

/**
 * Looks an invitation up by the hash of its token. Inside a transaction,
 * `lock` holds the row so two people cannot accept the same link at once.
 */
export async function findInvitationByTokenHash(
  db: Queryable,
  tokenHash: string,
  options: { lock?: boolean } = {},
): Promise<InvitationRow | null> {
  const [locked] = options.lock
    ? await db<{ id: string }[]>`
        select id from invitations where token_hash = ${tokenHash} for update
      `
    : await db<{ id: string }[]>`select id from invitations where token_hash = ${tokenHash}`;
  return locked ? findInvitationById(db, locked.id) : null;
}

/** Newest first; a community has a handful of these, not thousands. */
export async function listInvitations(db: Sql, limit = 200): Promise<InvitationRow[]> {
  return db<InvitationRow[]>`
    select ${invitationColumns(db)} ${invitationJoins(db)}
    order by i.created_at desc
    limit ${limit}
  `;
}

export async function markInvitationAccepted(
  db: Queryable,
  id: string,
  userId: string,
): Promise<void> {
  await db`
    update invitations set accepted_at = now(), accepted_by = ${userId} where id = ${id}
  `;
}

/** Revokes one invitation, if it is still open. Returns whether anything changed. */
export async function revokeInvitation(db: Sql, id: string): Promise<boolean> {
  const rows = await db`
    update invitations set revoked_at = now()
    where id = ${id} and accepted_at is null and revoked_at is null
    returning id
  `;
  return rows.length > 0;
}

/** Withdraws every open invitation somebody created - used when they are blocked. */
export async function revokeInvitationsCreatedBy(db: Sql, userId: string): Promise<void> {
  await db`
    update invitations set revoked_at = now()
    where created_by = ${userId} and accepted_at is null and revoked_at is null
  `;
}

export function invitationStatus(row: InvitationRow, now = new Date()): InvitationStatus {
  if (row.revokedAt) return 'revoked';
  if (row.acceptedAt) return 'accepted';
  if (new Date(row.expiresAt) <= now) return 'expired';
  return 'pending';
}

export function toInvitation(row: InvitationRow): Invitation {
  return {
    id: row.id,
    role: row.role,
    label: row.label,
    status: invitationStatus(row),
    createdByName: row.createdByName,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    acceptedByName: row.acceptedByName,
    acceptedAt: row.acceptedAt,
  };
}
