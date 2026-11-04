import {
  DEFAULT_ROLE,
  RESET_PASSWORD_PAGE_PATH,
  VERIFY_EMAIL_PAGE_PATH,
  type AuthSession,
  type DeleteAccountInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
  type TotpSetup,
} from '@ecomap/shared';
import type { Sql } from '../../db/client.js';
import { ApiError } from '../../http/api-error.js';
import { hashPassword, needsRehash, verifyPassword } from '../../auth/password.js';
import { generateTotpSecret, totpUri, verifyTotpCode } from '../../auth/totp.js';
import {
  accessTokenTtlSeconds,
  createOpaqueToken,
  createRefreshToken,
  hashOpaqueToken,
  hashRefreshToken,
  signAccessToken,
  type RefreshToken,
} from '../../auth/tokens.js';
import { env } from '../../env.js';
import { logger } from '../../logger.js';
import { sendMail } from '../../mail/mailer.js';
import { resetPasswordMail, verifyEmailMail } from '../../mail/templates.js';
import {
  countActiveSuperadmins,
  deleteUser,
  disableUserTotp,
  enableUserTotp,
  findUserByEmail,
  findUserById,
  insertUser,
  markEmailVerified,
  setUserTotpSecret,
  toCurrentUser,
  updateUserPassword,
  type UserRow,
} from '../users/repository.js';
import {
  consumeEmailToken,
  findActiveRefreshToken,
  insertEmailToken,
  insertRefreshToken,
  type EmailTokenPurpose,
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

/** How long the links in e-mails work. */
const VERIFY_LINK_HOURS = 48;
const RESET_LINK_HOURS = 1;

export const UNVERIFIED_MESSAGE =
  'Confirm your e-mail first - click the link we sent you, or ask for a new one.';

/**
 * Signing up creates the account and e-mails a confirmation link; it does not
 * sign in. Only someone who can open that inbox can use the account, so nobody
 * can sign up with another person's address. (Places they add still wait for a
 * moderator, as before - confirming the e-mail is about the account, not the
 * content.)
 */
export async function register(db: Sql, input: RegisterInput): Promise<void> {
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
    emailVerified: false,
  });

  await sendLink(db, user, 'verify_email');
}

/** Clicking the confirmation link: the address is confirmed and the person is signed in. */
export async function verifyEmail(db: Sql, token: string): Promise<IssuedSession> {
  const userId = await consumeEmailToken(db, hashOpaqueToken(token), 'verify_email');
  const user = userId ? await findUserById(db, userId) : null;
  if (!user) {
    throw ApiError.badRequest('That link has expired or has already been used - ask for a new one');
  }
  if (user.disabledAt) throw ApiError.forbidden(BLOCKED_MESSAGE);

  await markEmailVerified(db, user.id);
  return issueSession(db, user);
}

/**
 * A new confirmation link. Answers the same whether or not the address has an
 * account, so it cannot be used to find out who is signed up.
 */
export async function resendVerification(db: Sql, email: string): Promise<void> {
  const user = await findUserByEmail(db, email);
  if (!user || user.emailVerifiedAt || user.disabledAt) return;
  await sendLink(db, user, 'verify_email');
}

/** "I forgot my password": a reset link, with the same no-enumeration answer. */
export async function forgotPassword(db: Sql, email: string): Promise<void> {
  const user = await findUserByEmail(db, email);
  if (!user || user.disabledAt) return;
  await sendLink(db, user, 'reset_password');
}

/**
 * Choosing a new password from the link. Every session ends, as with a normal
 * password change, and the e-mail counts as confirmed - the link proved it.
 */
export async function resetPassword(db: Sql, input: ResetPasswordInput): Promise<void> {
  const userId = await consumeEmailToken(db, hashOpaqueToken(input.token), 'reset_password');
  const user = userId ? await findUserById(db, userId) : null;
  if (!user) {
    throw ApiError.badRequest('That link has expired or has already been used - ask for a new one');
  }
  if (user.disabledAt) throw ApiError.forbidden(BLOCKED_MESSAGE);

  await updateUserPassword(db, user.id, await hashPassword(input.newPassword));
  await markEmailVerified(db, user.id);
  await revokeAllRefreshTokensForUser(db, user.id);
}

/**
 * Creates a one-time link and e-mails it. A failed send is logged, not shown:
 * the answer to the person must not depend on it (enumeration), and they can
 * always ask for the link again.
 */
async function sendLink(db: Sql, user: UserRow, purpose: EmailTokenPurpose): Promise<void> {
  const { token, hash } = createOpaqueToken();
  const hours = purpose === 'verify_email' ? VERIFY_LINK_HOURS : RESET_LINK_HOURS;
  await insertEmailToken(db, {
    userId: user.id,
    purpose,
    tokenHash: hash,
    expiresAt: new Date(Date.now() + hours * 3_600_000),
  });

  const settings = await getCommunitySettings(db);
  const page = purpose === 'verify_email' ? VERIFY_EMAIL_PAGE_PATH : RESET_PASSWORD_PAGE_PATH;
  /* The token rides in the fragment: it never reaches a server log or a Referer header. */
  const link = `${env.PUBLIC_URL.replace(/\/$/, '')}${page}#token=${token}`;
  const mail = {
    to: user.email,
    communityName: settings.name,
    link,
    locale: settings.defaultLocale,
  };

  try {
    await sendMail(purpose === 'verify_email' ? verifyEmailMail(mail) : resetPasswordMail(mail));
  } catch (error) {
    logger.error({ err: error, purpose }, 'Could not send the e-mail');
  }
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

  /* Also only after the password, for the same reason. */
  if (!user.emailVerifiedAt) {
    throw ApiError.emailUnverified(UNVERIFIED_MESSAGE);
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

/**
 * Someone deleting their own account (the GDPR right to erasure, without
 * having to ask an admin). Their unreviewed suggestions always go - they were
 * only ever visible to moderators; their places go too if they asked for it,
 * otherwise those stay on the map as "added by a former member".
 *
 * The last superadmin cannot leave: nobody could hand out roles any more.
 */
export async function deleteAccount(
  db: Sql,
  userId: string,
  input: DeleteAccountInput,
): Promise<void> {
  const user = await requireUser(db, userId);

  if (!(await verifyPassword(input.password, user.passwordHash))) {
    throw ApiError.invalidCredentials('Your password is not correct');
  }
  if (user.role === 'superadmin' && (await countActiveSuperadmins(db)) <= 1) {
    throw ApiError.conflict(
      'You are the only superadmin. Make someone else superadmin first, so the map is not left without one.',
    );
  }

  await db.begin(async (tx) => {
    await tx`
      delete from feature_suggestions where proposed_by = ${user.id} and status = 'pending'
    `;
    if (input.deleteContributions) {
      /* Their photos and any suggestions about these places go with them (cascade). */
      await tx`delete from features where created_by = ${user.id}`;
    }
    await deleteUser(tx, user.id);
  });
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
