import { z } from 'zod';

/**
 * One error shape for every failing API response, so the web app has exactly one
 * thing to parse and can map `code` to a translated message.
 */
export const API_ERROR_CODES = [
  'bad_request',
  'validation_failed',
  'unauthorized',
  'totp_required',
  'invalid_credentials',
  'forbidden',
  /** Signed up but has not clicked the link in the confirmation e-mail yet. */
  'email_unverified',
  'not_found',
  'conflict',
  'rate_limited',
  'payload_too_large',
  'internal_error',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const fieldIssueSchema = z.object({
  /** Dotted path, e.g. `properties.openingHours`. Empty for form-level issues. */
  path: z.string(),
  message: z.string(),
});
export type FieldIssue = z.infer<typeof fieldIssueSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    message: z.string(),
    issues: z.array(fieldIssueSchema).optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;

export const HTTP_STATUS_BY_ERROR_CODE: Readonly<Record<ApiErrorCode, number>> = {
  bad_request: 400,
  validation_failed: 422,
  unauthorized: 401,
  totp_required: 401,
  invalid_credentials: 401,
  forbidden: 403,
  email_unverified: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  payload_too_large: 413,
  internal_error: 500,
};

/** Turns Zod's issue list into our transport shape. */
export function toFieldIssues(error: z.ZodError): FieldIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}
