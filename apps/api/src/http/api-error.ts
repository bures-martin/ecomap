import {
  HTTP_STATUS_BY_ERROR_CODE,
  toFieldIssues,
  type ApiErrorCode,
  type FieldIssue,
} from '@ecomap/shared';
import type { z } from 'zod';

/**
 * The only error type route handlers throw deliberately. Anything else that
 * escapes a handler is a bug and becomes a 500 with no detail leaked.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly issues: FieldIssue[] | undefined;

  constructor(code: ApiErrorCode, message: string, issues?: FieldIssue[]) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = HTTP_STATUS_BY_ERROR_CODE[code];
    this.issues = issues;
  }

  static badRequest(message: string): ApiError {
    return new ApiError('bad_request', message);
  }

  static validation(error: z.ZodError, message = 'Some fields need attention'): ApiError {
    return new ApiError('validation_failed', message, toFieldIssues(error));
  }

  static unauthorized(message = 'Sign in to continue'): ApiError {
    return new ApiError('unauthorized', message);
  }

  static invalidCredentials(message = 'That email and password do not match'): ApiError {
    return new ApiError('invalid_credentials', message);
  }

  static totpRequired(message = 'Enter your two-factor code'): ApiError {
    return new ApiError('totp_required', message);
  }

  static forbidden(message = 'You do not have permission to do that'): ApiError {
    return new ApiError('forbidden', message);
  }

  static totpSetupRequired(
    message = 'Turn on two-factor sign-in under Your account before using the admin pages',
  ): ApiError {
    return new ApiError('totp_setup_required', message);
  }

  static emailUnverified(message: string): ApiError {
    return new ApiError('email_unverified', message);
  }

  static notFound(what = 'That'): ApiError {
    return new ApiError('not_found', `${what} could not be found`);
  }

  static conflict(message: string): ApiError {
    return new ApiError('conflict', message);
  }

  static payloadTooLarge(message = 'That upload is too large'): ApiError {
    return new ApiError('payload_too_large', message);
  }
}

/**
 * Parses untrusted input, throwing a validation `ApiError` on failure.
 *
 * Used directly inside handlers rather than as middleware: Express 5 exposes
 * `req.query` as a getter, so a middleware cannot write the parsed value back,
 * and this keeps the parsed type visible at the call site.
 */
export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown, message?: string): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw ApiError.validation(result.error, message);
  }
  return result.data;
}
