import {
  authSessionSchema,
  communitySettingsSchema,
  currentUserSchema,
  featureCollectionSchema,
  featureSchema,
  fromFeatureCollection,
  layerSchema,
  totpSetupSchema,
  type AuthSession,
  type CommunitySettings,
  type CreateFeatureInput,
  type CreateLayerInput,
  type CurrentUser,
  type Feature,
  type FeatureStatus,
  type Layer,
  type LoginInput,
  type ModerateFeatureInput,
  type RegisterInput,
  type TotpSetup,
  type UpdateCommunitySettingsInput,
  type UpdateFeatureInput,
  type UpdateLayerInput,
} from '@ecomap/shared';
import { z } from 'zod';
import { apiRequest } from './client.js';
import type { MapFilters } from '../map/filters.js';

/** One function per endpoint, so components never build URLs themselves. */

export const settingsApi = {
  get: () => apiRequest('/api/settings', { schema: communitySettingsSchema }),
  update: (input: UpdateCommunitySettingsInput): Promise<CommunitySettings> =>
    apiRequest('/api/settings', {
      method: 'PATCH',
      body: input,
      schema: communitySettingsSchema,
    }),
};

const layerListSchema = z.array(layerSchema);

export const layersApi = {
  list: (): Promise<Layer[]> => apiRequest('/api/layers', { schema: layerListSchema }),
  create: (input: CreateLayerInput): Promise<Layer> =>
    apiRequest('/api/layers', { method: 'POST', body: input, schema: layerSchema }),
  update: (id: string, input: UpdateLayerInput): Promise<Layer> =>
    apiRequest(`/api/layers/${id}`, { method: 'PATCH', body: input, schema: layerSchema }),
  remove: (id: string, confirm: boolean): Promise<void> =>
    apiRequest(`/api/layers/${id}${confirm ? '?confirm=true' : ''}`, { method: 'DELETE' }),
};

export interface FeatureListResult {
  features: Feature[];
  total: number;
}

export const featuresApi = {
  list: async (filters: MapFilters, signal?: AbortSignal): Promise<FeatureListResult> => {
    const collection = await apiRequest(`/api/features?${featureQueryString(filters)}`, {
      schema: featureCollectionSchema,
      ...(signal ? { signal } : {}),
    });
    return { features: fromFeatureCollection(collection), total: collection.total };
  },
  get: (id: string): Promise<Feature> =>
    apiRequest(`/api/features/${id}`, { schema: featureSchema }),
  create: (input: CreateFeatureInput): Promise<Feature> =>
    apiRequest('/api/features', { method: 'POST', body: input, schema: featureSchema }),
  update: (id: string, input: UpdateFeatureInput): Promise<Feature> =>
    apiRequest(`/api/features/${id}`, { method: 'PATCH', body: input, schema: featureSchema }),
  remove: (id: string): Promise<void> => apiRequest(`/api/features/${id}`, { method: 'DELETE' }),
  moderate: (id: string, input: ModerateFeatureInput): Promise<Feature> =>
    apiRequest(`/api/features/${id}/moderate`, {
      method: 'POST',
      body: input,
      schema: featureSchema,
    }),
};

export const authApi = {
  register: (input: RegisterInput): Promise<AuthSession> =>
    apiRequest('/api/auth/register', { method: 'POST', body: input, schema: authSessionSchema }),
  login: (input: LoginInput): Promise<AuthSession> =>
    apiRequest('/api/auth/login', { method: 'POST', body: input, schema: authSessionSchema }),
  refresh: (): Promise<AuthSession> =>
    apiRequest('/api/auth/refresh', {
      method: 'POST',
      schema: authSessionSchema,
      skipRetry: true,
    }),
  logout: (): Promise<void> => apiRequest('/api/auth/logout', { method: 'POST' }),
  me: (): Promise<CurrentUser> => apiRequest('/api/auth/me', { schema: currentUserSchema }),
  changePassword: (input: { currentPassword: string; newPassword: string }): Promise<void> =>
    apiRequest('/api/auth/me/password', { method: 'POST', body: input }),
  startTotpSetup: (): Promise<TotpSetup> =>
    apiRequest('/api/auth/me/totp/setup', { method: 'POST', schema: totpSetupSchema }),
  enableTotp: (code: string): Promise<void> =>
    apiRequest('/api/auth/me/totp/enable', { method: 'POST', body: { code } }),
  disableTotp: (password: string): Promise<void> =>
    apiRequest('/api/auth/me/totp/disable', { method: 'POST', body: { password } }),
};

const userListSchema = z.array(currentUserSchema);

export const usersApi = {
  list: (): Promise<CurrentUser[]> => apiRequest('/api/users', { schema: userListSchema }),
  setRole: (id: string, role: CurrentUser['role']): Promise<CurrentUser> =>
    apiRequest(`/api/users/${id}/role`, {
      method: 'PATCH',
      body: { role },
      schema: currentUserSchema,
    }),
};

/**
 * Serialises the filters exactly as `featureQuerySchema` parses them, which is
 * also exactly what sits in the browser's address bar.
 */
export function featureQueryString(filters: MapFilters): string {
  const params = new URLSearchParams();
  if (filters.layers.length > 0) params.set('layers', filters.layers.join(','));
  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.status) params.set('status', filters.status satisfies FeatureStatus);
  if (filters.mine) params.set('mine', 'true');
  return params.toString();
}
