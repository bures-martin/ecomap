import { apiErrorSchema, type ApiErrorCode, type FieldIssue } from '@ecomap/shared';
import type { z } from 'zod';

/**
 * Thin typed wrapper around `fetch`.
 *
 * Every response is validated against the shared Zod schema, so a server change
 * that the client has not caught up with fails loudly here rather than as
 * `undefined is not an object` three components deep.
 */

export class ApiRequestError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly issues: FieldIssue[];

  constructor(status: number, code: ApiErrorCode, message: string, issues: FieldIssue[] = []) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.issues = issues;
  }

  /** The message for one field, for wiring straight into a MUI `helperText`. */
  issueFor(path: string): string | undefined {
    return this.issues.find((issue) => issue.path === path)?.message;
  }
}

/**
 * The access token lives in a module variable rather than in `localStorage`:
 * script-readable storage is exactly what an XSS would go looking for. It is
 * lost on reload, and restored from the httpOnly refresh cookie at startup.
 */
let accessToken: string | null = null;
let refreshSession: (() => Promise<string | null>) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Registered by the auth provider so a 401 can transparently retry once. */
export function setSessionRefresher(refresher: (() => Promise<string | null>) | null): void {
  refreshSession = refresher;
}

export interface RequestOptions<T> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Sent as JSON - or as-is, with its own type, when it is a `Blob` (an image upload). */
  body?: unknown;
  schema?: z.ZodType<T>;
  signal?: AbortSignal;
  /** Set for the refresh call itself, to avoid an infinite retry loop. */
  skipRetry?: boolean;
}

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

/** Turns a server-relative path such as an `avatarUrl` into one the browser can load. */
export function apiAssetUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export async function apiRequest<T>(path: string, options: RequestOptions<T> = {}): Promise<T> {
  const response = await sendRequest(path, options);

  if (response.status === 401 && !options.skipRetry && refreshSession) {
    const token = await refreshSession();
    if (token) {
      return handleResponse(await sendRequest(path, { ...options, skipRetry: true }), options);
    }
  }

  return handleResponse(response, options);
}

async function sendRequest<T>(path: string, options: RequestOptions<T>): Promise<Response> {
  const headers = new Headers({ Accept: 'application/json' });
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let body: BodyInit | undefined;
  if (options.body instanceof Blob) {
    headers.set('Content-Type', options.body.type || 'application/octet-stream');
    body = options.body;
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }

  return fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    /* Only the refresh endpoint has a cookie, but it must be sent when it does. */
    credentials: 'include',
    ...(body !== undefined ? { body } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  });
}

async function handleResponse<T>(response: Response, options: RequestOptions<T>): Promise<T> {
  if (!response.ok) {
    throw await toRequestError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json();
  if (!options.schema) {
    return payload as T;
  }

  const parsed = options.schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiRequestError(
      response.status,
      'internal_error',
      'The server sent something this version of the app does not understand',
    );
  }
  return parsed.data;
}

async function toRequestError(response: Response): Promise<ApiRequestError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    /* A proxy or a crash can return HTML; fall through to the generic message. */
  }

  const parsed = apiErrorSchema.safeParse(body);
  if (parsed.success) {
    const { code, message, issues } = parsed.data.error;
    return new ApiRequestError(response.status, code, message, issues ?? []);
  }

  return new ApiRequestError(
    response.status,
    response.status >= 500 ? 'internal_error' : 'bad_request',
    `Request failed (${response.status})`,
  );
}
