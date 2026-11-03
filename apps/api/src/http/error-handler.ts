import type { ApiErrorBody } from '@ecomap/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError } from './api-error.js';
import { isProduction } from '../env.js';
import { logger } from '../logger.js';

/** Terminal 404 for anything that did not match a route. */
export const notFoundHandler: RequestHandler = (_req, res) => {
  const body: ApiErrorBody = {
    error: { code: 'not_found', message: 'No such endpoint' },
  };
  res.status(404).json(body);
};

/**
 * Single exit point for failures. Express 5 forwards rejected promises from
 * async handlers here automatically, so handlers need no try/catch wrapper.
 */
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  const apiError = toApiError(error);

  if (apiError.status >= 500) {
    logger.error({ err: error }, 'Unhandled error');
  } else {
    logger.debug({ code: apiError.code, message: apiError.message }, 'Request rejected');
  }

  const body: ApiErrorBody = {
    error: {
      code: apiError.code,
      message: apiError.message,
      ...(apiError.issues ? { issues: apiError.issues } : {}),
    },
  };

  res.status(apiError.status).json(body);
};

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof ZodError) return ApiError.validation(error);

  /* Body parsers throw a SyntaxError with a `status` for malformed JSON. */
  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    return ApiError.badRequest('The request body is not valid JSON');
  }

  /* Body parsers flag an oversized body (a JSON payload or an upload) with this type. */
  if (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.too.large'
  ) {
    return ApiError.payloadTooLarge();
  }

  /* Never leak internals to the client; the real error is in the log above. */
  return new ApiError(
    'internal_error',
    isProduction || !(error instanceof Error) ? 'Something went wrong on our side' : error.message,
  );
}
