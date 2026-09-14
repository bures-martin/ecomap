import type { ApiErrorBody } from '@ecomap/shared';
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { isTest } from '../env.js';

const tooManyRequests: ApiErrorBody = {
  error: { code: 'rate_limited', message: 'Too many attempts - please wait a moment' },
};

function createLimiter(options: { windowMs: number; limit: number }): RateLimitRequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: tooManyRequests,
    /* Tests would otherwise trip the limiter and fail for the wrong reason. */
    skip: () => isTest,
  });
}

/**
 * Tight limit on the endpoints that take a password or a two-factor code: this
 * is what turns a leaked password list from "try them all" into "try a few".
 */
export const authRateLimiter = createLimiter({ windowMs: 15 * 60_000, limit: 20 });

/** Generous limit on everything else, to blunt accidental request storms. */
export const apiRateLimiter = createLimiter({ windowMs: 60_000, limit: 600 });

/** Writes are cheaper to abuse than reads, so they get their own budget. */
export const writeRateLimiter = createLimiter({ windowMs: 60_000, limit: 60 });
