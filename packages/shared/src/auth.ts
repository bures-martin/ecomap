import { z } from 'zod';
import { permissionSchema, roleSchema } from './permissions.js';

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Password policy: length does most of the work, but we require a little variety
 * so a 12-character passphrase of one repeated letter does not pass.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH)
  .refine((value) => /[a-z]/i.test(value), 'Include at least one letter')
  .refine((value) => /[^a-z]/i.test(value), 'Include at least one number or symbol');

export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());

export const displayNameSchema = z.string().trim().min(2).max(80);

/** A six-digit TOTP code, tolerating the spaces authenticator apps like to show. */
export const totpCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, ''))
  .pipe(z.string().regex(/^\d{6}$/, 'Enter the six-digit code'));

export const registerInputSchema = z.object({
  email: emailSchema,
  displayName: displayNameSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password').max(PASSWORD_MAX_LENGTH),
  /** Present only when the account has two-factor authentication enabled. */
  totpCode: totpCodeSchema.optional(),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;

export const totpEnableInputSchema = z.object({
  code: totpCodeSchema,
});
export type TotpEnableInput = z.infer<typeof totpEnableInputSchema>;

export const totpDisableInputSchema = z.object({
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});
export type TotpDisableInput = z.infer<typeof totpDisableInputSchema>;

/**
 * Deleting one's own account. The password proves it is really them, not
 * someone at an unlocked computer; `deleteContributions` decides whether the
 * places they added go too, or stay on the map without their name.
 */
export const deleteAccountInputSchema = z.object({
  password: z.string().min(1, 'Enter your password').max(PASSWORD_MAX_LENGTH),
  deleteContributions: z.boolean().default(false),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountInputSchema>;

/* -------------------------------------------- links sent by e-mail ---- */

/** "Send me the link again" and "I forgot my password": just an address. */
export const emailInputSchema = z.object({ email: emailSchema });
export type EmailInput = z.infer<typeof emailInputSchema>;

/** The secret from a confirmation or reset link (it travels in the URL fragment). */
export const emailTokenSchema = z.string().min(20).max(200);

export const verifyEmailInputSchema = z.object({ token: emailTokenSchema });
export type VerifyEmailInput = z.infer<typeof verifyEmailInputSchema>;

export const resetPasswordInputSchema = z.object({
  token: emailTokenSchema,
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;

/** Signing up no longer signs in: the e-mail address is confirmed first. */
export const registerResultSchema = z.object({ status: z.literal('verification_sent') });
export type RegisterResult = z.infer<typeof registerResultSchema>;

/** The web pages the e-mailed links open; the token follows as #token=... */
export const VERIFY_EMAIL_PAGE_PATH = '/verify-email';
export const RESET_PASSWORD_PAGE_PATH = '/reset-password';

export const publicUserSchema = z.object({
  id: z.uuid(),
  displayName: displayNameSchema,
});
export type PublicUser = z.infer<typeof publicUserSchema>;

export const currentUserSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  displayName: z.string(),
  role: roleSchema,
  permissions: z.array(permissionSchema),
  totpEnabled: z.boolean(),
  /** Versioned path of the profile picture, or null if none was uploaded. */
  avatarUrl: z.string().nullable(),
  /** Blocked accounts can no longer sign in; their contributions stay. */
  disabled: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type CurrentUser = z.infer<typeof currentUserSchema>;

export const authSessionSchema = z.object({
  accessToken: z.string(),
  /** Seconds until `accessToken` expires; the client refreshes shortly before. */
  expiresIn: z.number().int().positive(),
  user: currentUserSchema,
});
export type AuthSession = z.infer<typeof authSessionSchema>;

export const totpSetupSchema = z.object({
  secret: z.string(),
  /** `otpauth://` URI to render as a QR code. */
  uri: z.string(),
});
export type TotpSetup = z.infer<typeof totpSetupSchema>;

export const updateUserRoleInputSchema = z.object({
  role: roleSchema,
});
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleInputSchema>;
