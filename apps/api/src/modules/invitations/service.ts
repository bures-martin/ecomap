import {
  invitableRoles,
  type AcceptInvitationInput,
  type CreatedInvitation,
  type CreateInvitationInput,
  type InvitationPreview,
} from '@ecomap/shared';
import type { AuthContext } from '../../auth/context.js';
import { hashPassword } from '../../auth/password.js';
import { createOpaqueToken, hashOpaqueToken } from '../../auth/tokens.js';
import type { Sql } from '../../db/client.js';
import { ApiError } from '../../http/api-error.js';
import { issueSession, type IssuedSession } from '../auth/service.js';
import { getCommunitySettings } from '../settings/repository.js';
import { findUserByEmail, insertUser } from '../users/repository.js';
import {
  findInvitationById,
  findInvitationByTokenHash,
  insertInvitation,
  invitationStatus,
  markInvitationAccepted,
  revokeInvitation,
  toInvitation,
  type InvitationRow,
} from './repository.js';

/** One answer for every unusable link, so a link reveals nothing about why. */
const UNUSABLE_LINK = 'This invitation link is no longer valid. Ask for a new one.';

export async function createInvitation(
  db: Sql,
  actor: AuthContext,
  input: CreateInvitationInput,
): Promise<CreatedInvitation> {
  if (!invitableRoles(actor.role).includes(input.role)) {
    throw ApiError.forbidden('You cannot invite somebody with that role');
  }

  const { token, hash } = createOpaqueToken();
  const row = await insertInvitation(db, {
    tokenHash: hash,
    role: input.role,
    label: input.label,
    createdBy: actor.userId,
    expiresAt: new Date(Date.now() + input.expiresInDays * 86_400_000),
  });

  return { invitation: toInvitation(row), token };
}

/**
 * Anyone who could have created an invitation may withdraw it; on top of that,
 * people can always withdraw their own.
 */
export async function revoke(db: Sql, actor: AuthContext, id: string): Promise<void> {
  const row = await findInvitationById(db, id);
  if (!row) throw ApiError.notFound('That invitation');

  const mayRevoke =
    row.createdById === actor.userId || invitableRoles(actor.role).includes(row.role);
  if (!mayRevoke) throw ApiError.forbidden();

  if (!(await revokeInvitation(db, id))) {
    throw ApiError.conflict('That invitation was already used or withdrawn');
  }
}

export async function preview(db: Sql, token: string): Promise<InvitationPreview> {
  const row = await usableInvitation(db, token);
  const settings = await getCommunitySettings(db);
  return {
    role: row.role,
    label: row.label,
    communityName: settings.name,
    expiresAt: row.expiresAt,
  };
}

/**
 * Turns a link into an account. Runs in one transaction with the invitation
 * row locked, so the same link cannot create two accounts. Works whether or
 * not the community allows open registration - that is the point of it.
 */
export async function accept(db: Sql, input: AcceptInvitationInput): Promise<IssuedSession> {
  const passwordHash = await hashPassword(input.password);
  const tokenHash = hashOpaqueToken(input.token);

  const user = await db.begin(async (tx) => {
    const row = await findInvitationByTokenHash(tx, tokenHash, { lock: true });
    if (!row || invitationStatus(row) !== 'pending') throw new ApiError('not_found', UNUSABLE_LINK);

    if (await findUserByEmail(tx, input.email)) {
      throw ApiError.conflict('An account with that email already exists - sign in instead');
    }

    const created = await insertUser(tx, {
      email: input.email,
      displayName: input.displayName,
      passwordHash,
      role: row.role,
    });
    await markInvitationAccepted(tx, row.id, created.id);
    return created;
  });

  return issueSession(db, user);
}

async function usableInvitation(db: Sql, token: string): Promise<InvitationRow> {
  const row = await findInvitationByTokenHash(db, hashOpaqueToken(token));
  if (!row || invitationStatus(row) !== 'pending') throw new ApiError('not_found', UNUSABLE_LINK);
  return row;
}
