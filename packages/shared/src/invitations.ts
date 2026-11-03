import { z } from 'zod';
import { registerInputSchema } from './auth.js';
import { roleSchema } from './permissions.js';

/**
 * Invitation links: how people join a community that does not allow open
 * registration.
 *
 * An admin creates one for a role and passes the link on however they like.
 * The link is single-use and expires; only a hash of its token is stored, so a
 * database leak hands out no working invitations.
 */

export const INVITATION_DEFAULT_DAYS = 7;
export const INVITATION_MAX_DAYS = 30;

export const INVITATION_STATUSES = ['pending', 'accepted', 'expired', 'revoked'] as const;
export const invitationStatusSchema = z.enum(INVITATION_STATUSES);
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;

export const createInvitationInputSchema = z.object({
  role: roleSchema,
  /** Who it is for, so the admin can tell their open invitations apart. */
  label: z.string().trim().max(120).default(''),
  expiresInDays: z.number().int().min(1).max(INVITATION_MAX_DAYS).default(INVITATION_DEFAULT_DAYS),
});
export type CreateInvitationInput = z.infer<typeof createInvitationInputSchema>;
export type CreateInvitationInputDraft = z.input<typeof createInvitationInputSchema>;

export const invitationSchema = z.object({
  id: z.uuid(),
  role: roleSchema,
  label: z.string(),
  status: invitationStatusSchema,
  createdByName: z.string().nullable(),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  acceptedByName: z.string().nullable(),
  acceptedAt: z.iso.datetime().nullable(),
});
export type Invitation = z.infer<typeof invitationSchema>;

/** Returned once, at creation: the raw token is never retrievable again. */
export const createdInvitationSchema = z.object({
  invitation: invitationSchema,
  token: z.string(),
});
export type CreatedInvitation = z.infer<typeof createdInvitationSchema>;

export const invitationTokenSchema = z.string().trim().min(20).max(200);

export const invitationTokenInputSchema = z.object({ token: invitationTokenSchema });

/** What somebody holding a valid link may see before accepting it. */
export const invitationPreviewSchema = z.object({
  role: roleSchema,
  label: z.string(),
  communityName: z.string(),
  expiresAt: z.iso.datetime(),
});
export type InvitationPreview = z.infer<typeof invitationPreviewSchema>;

export const acceptInvitationInputSchema = registerInputSchema.extend({
  token: invitationTokenSchema,
});
export type AcceptInvitationInput = z.infer<typeof acceptInvitationInputSchema>;

export const updateUserStatusInputSchema = z.object({ disabled: z.boolean() });
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusInputSchema>;

/** The path of the web page that accepts an invitation. The token rides in the fragment. */
export const INVITATION_PAGE_PATH = '/join';
