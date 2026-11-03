import {
  DEFAULT_ROLE,
  type AuthSession,
  type LoginInput,
  type RegisterInput,
  type TotpSetup,
} from '@ecomap/shared';
import type { Sql } from '../../db/client.js';
import { ApiError } from '../../http/api-error.js';
import { hashPassword, needsRehash, verifyPassword } from '../../auth/password.js';
import { generateTotpSecret, totpUri, verifyTotpCode } from '../../auth/totp.js';
import {
  accessTokenTtlSeconds,
  createRefreshToken,
  hashRefreshToken,
  signAccessToken,
  type RefreshToken,
} from '../../auth/tokens.js';
import {
  disableUserTotp,
  enableUserTotp,
  findUserByEmail,
  findUserById,
  insertUser,
  setUserTotpSecret,
  toCurrentUser,
  updateUserPassword,
  type UserRow,
} from '../users/repository.js';
import {
  findActiveRefreshToken,
  insertRefreshToken,
  revokeAllRefreshTokensForUser,
  revokeRefreshToken,
} from './repository.js';
import { getCommunitySettings } from '../settings/repository.js';

export const BLOCKED_MESSAGE =
  'This account has been blocked. Contact the people who run this map.';

export interface IssuedSession {
  session: AuthSession;
  refreshToken: RefreshToken;
}

/**
 * A dummy hash with the current parameters. Verifying against it when no user
 * exists keeps the response time of "unknown email" and "wrong password" in the
 * same ballpark, so login cannot be used to enumerate accounts.
 *
 * Computed on first use, then cached - hashing costs ~100ms and should not be
 * paid at import time.
 */
let timingDecoyHash: Promise<string> | null = null;

function getTimingDecoyHash(): Promise<string> {
  timingDecoyHash ??= hashPassword('ecomap-login-timing-decoy');
  return timingDecoyHash;
}

export async function register(db: Sql, input: RegisterInput): Promise<IssuedSession> {
  const settings = await getCommunitySettings(db);
  if (!settings.allowPublicRegistration) {
    throw ApiError.forbidden('This community is invite-only right now');
  }

  const existing = await findUserByEmail(db, input.email);
  if (existing) {
    throw ApiError.conflict('An account with that email already exists');
  }

  const user = await insertUser(db, {
    email: input.email,
    displayName: input.displayName,
    passwordHash: await hashPassword(input.password),
    role: DEFAULT_ROLE,
  });

  return issueSession(db, user);
}

export async function login(db: Sql, input: LoginInput): Promise<IssuedSession> {
  const user = await findUserByEmail(db, input.email);

  const passwordOk = user
    ? await verifyPassword(input.password, user.passwordHash)
    : await verifyPassword(input.password, await getTimingDecoyHash());

  if (!user || !passwordOk) {
    throw ApiError.invalidCredentials();
  }

  /*
   * Checked only after the password, so the "blocked" answer cannot be used to
   * find out which email addresses have an account.
   */
  if (user.disabledAt) {
    throw ApiError.forbidden(BLOCKED_MESSAGE);
  }

  if (user.totpEnabled) {
    if (!input.totpCode) {
      throw ApiError.totpRequired();
    }
    if (!user.totpSecret || !verifyTotpCode(user.totpSecret, input.totpCode)) {
      throw ApiError.invalidCredentials('That two-factor code is not valid');
    }
  }

  /* Opportunistic upgrade if the cost parameters have been raised since signup. */
  if (needsRehash(user.passwordHash)) {
    await updateUserPassword(db, user.id, await hashPassword(input.password));
  }

  return issueSession(db, user);
}

/**
 * Rotates a refresh token: the presented one is revoked and a new one issued, so
 * a stolen token is usable at most once before the real user's next refresh
 * invalidates it.
 */
export async function refresh(db: Sql, presentedToken: string): Promise<IssuedSession> {
  const tokenHash = hashRefreshToken(presentedToken);
  const stored = await findActiveRefreshToken(db, tokenHash);
  if (!stored) {
    throw ApiError.unauthorized('Your session has expired - please sign in again');
  }

  const user = await findUserById(db, stored.userId);
  if (!user) {
    throw ApiError.unauthorized('Your session has expired - please sign in again');
  }
  if (user.disabledAt) {
    await revokeRefreshToken(db, tokenHash);
    throw ApiError.unauthorized(BLOCKED_MESSAGE);
  }

  await revokeRefreshToken(db, tokenHash);
  return issueSession(db, user);
}

export async function logout(db: Sql, presentedToken: string | undefined): Promise<void> {
  if (!presentedToken) return;
  await revokeRefreshToken(db, hashRefreshToken(presentedToken));
}

export async function changePassword(
  db: Sql,
  userId: string,
  input: { currentPassword: string; newPassword: string },
): Promise<void> {
  const user = await requireUser(db, userId);

  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw ApiError.invalidCredentials('Your current password is not correct');
  }

  await updateUserPassword(db, userId, await hashPassword(input.newPassword));
  /* Changing a password ends every other session - the usual expectation. */
  await revokeAllRefreshTokensForUser(db, userId);
}

export async function startTotpSetup(db: Sql, userId: string): Promise<TotpSetup> {
  const user = await requireUser(db, userId);
  if (user.totpEnabled) {
    throw ApiError.conflict('Two-factor authentication is already on');
  }

  const settings = await getCommunitySettings(db);
  const secret = generateTotpSecret();
  await setUserTotpSecret(db, userId, secret);

  return { secret, uri: totpUri({ secret, account: user.email, issuer: settings.name }) };
}

export async function confirmTotpSetup(db: Sql, userId: string, code: string): Promise<void> {
  const user = await requireUser(db, userId);
  if (!user.totpSecret) {
    throw ApiError.badRequest('Start the two-factor setup first');
  }
  if (!verifyTotpCode(user.totpSecret, code)) {
    throw ApiError.badRequest('That code did not match - check your authenticator app');
  }
  await enableUserTotp(db, userId);
}

export async function disableTotp(db: Sql, userId: string, password: string): Promise<void> {
  const user = await requireUser(db, userId);
  if (!(await verifyPassword(password, user.passwordHash))) {
    throw ApiError.invalidCredentials('Your password is not correct');
  }
  await disableUserTotp(db, userId);
}

async function requireUser(db: Sql, userId: string): Promise<UserRow> {
  const user = await findUserById(db, userId);
  if (!user) throw ApiError.unauthorized();
  return user;
}

export async function issueSession(db: Sql, user: UserRow): Promise<IssuedSession> {
  const refreshToken = createRefreshToken();
  await insertRefreshToken(db, {
    userId: user.id,
    tokenHash: refreshToken.hash,
    expiresAt: refreshToken.expiresAt,
  });

  return {
    session: {
      accessToken: await signAccessToken({ userId: user.id, role: user.role }),
      expiresIn: accessTokenTtlSeconds(),
      user: toCurrentUser(user),
    },
    refreshToken,
  };
}
