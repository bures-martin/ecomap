import { pino } from 'pino';
import { env, isProduction, isTest } from './env.js';

/**
 * Structured JSON logs in production; human-readable in development.
 *
 * `redact` is not optional here - request logging would otherwise write
 * authorization headers and cookies straight into the log stream.
 */
export const logger = pino({
  level: isTest ? 'silent' : env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.newPassword',
      '*.currentPassword',
      '*.totpSecret',
      '*.accessToken',
      '*.refreshToken',
    ],
    censor: '[redacted]',
  },
  ...(isProduction || isTest
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }),
});

export type Logger = typeof logger;
