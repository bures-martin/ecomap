import { layerSchema } from '@ecomap/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiRequestError, apiRequest, setAccessToken, setSessionRefresher } from './client.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiRequest', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    setAccessToken(null);
    setSessionRefresher(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends no Authorization header when signed out', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await apiRequest('/api/settings');

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);
    expect(headers.has('Authorization')).toBe(false);
  });

  it('attaches the access token once it is set', async () => {
    setAccessToken('token-123');
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await apiRequest('/api/settings');

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer token-123');
  });

  it('sends a Blob as raw bytes with its own content type', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    const image = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
    await apiRequest('/api/auth/me/avatar', { method: 'PUT', body: image });

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(new Headers(init?.headers).get('Content-Type')).toBe('image/jpeg');
    expect(init?.body).toBe(image);
  });

  it('returns undefined for a 204 without trying to parse a body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(apiRequest('/api/features/x', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('validates the response against the given schema', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ nonsense: true }));

    await expect(apiRequest('/api/layers/x', { schema: layerSchema })).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });

  it('passes a valid response through the schema', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ count: 3 }));
    const result = await apiRequest('/api/thing', { schema: z.object({ count: z.number() }) });
    expect(result).toEqual({ count: 3 });
  });

  it('turns a structured API error into an ApiRequestError with its issues', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 'validation_failed',
            message: 'Some fields need attention',
            issues: [{ path: 'name', message: 'Give it a short name' }],
          },
        },
        422,
      ),
    );

    const error = await apiRequest('/api/features', { method: 'POST', body: {} }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiRequestError);
    const apiError = error as ApiRequestError;
    expect(apiError.code).toBe('validation_failed');
    expect(apiError.status).toBe(422);
    expect(apiError.issueFor('name')).toBe('Give it a short name');
    expect(apiError.issueFor('description')).toBeUndefined();
  });

  it('copes with an error response that is not JSON at all', async () => {
    fetchMock.mockResolvedValue(new Response('<html>502</html>', { status: 502 }));

    const error = await apiRequest('/api/settings').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect((error as ApiRequestError).code).toBe('internal_error');
  });

  it('refreshes once and retries after a 401', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'unauthorized', message: 'no' } }, 401))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const refresher = vi.fn(() => {
      setAccessToken('fresh-token');
      return Promise.resolve('fresh-token');
    });
    setSessionRefresher(refresher);

    await expect(apiRequest('/api/auth/me')).resolves.toEqual({ ok: true });
    expect(refresher).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [, retryInit] = fetchMock.mock.calls[1] ?? [];
    expect(new Headers(retryInit?.headers).get('Authorization')).toBe('Bearer fresh-token');
  });

  it('gives up after one failed refresh instead of looping', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: 'unauthorized', message: 'no' } }, 401),
    );
    const refresher = vi.fn(() => Promise.resolve(null));
    setSessionRefresher(refresher);

    await expect(apiRequest('/api/auth/me')).rejects.toBeInstanceOf(ApiRequestError);
    expect(refresher).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry the refresh call itself', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: 'unauthorized', message: 'no' } }, 401),
    );
    const refresher = vi.fn(() => Promise.resolve('never-used'));
    setSessionRefresher(refresher);

    await expect(
      apiRequest('/api/auth/refresh', { method: 'POST', skipRetry: true }),
    ).rejects.toBeInstanceOf(ApiRequestError);
    expect(refresher).not.toHaveBeenCalled();
  });
});
