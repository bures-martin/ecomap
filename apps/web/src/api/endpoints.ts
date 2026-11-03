import {
  authSessionSchema,
  communitySettingsSchema,
  createdInvitationSchema,
  currentUserSchema,
  featureCollectionSchema,
  featureSchema,
  featureSuggestionSchema,
  fromFeatureCollection,
  invitationPreviewSchema,
  invitationSchema,
  layerSchema,
  totpSetupSchema,
  type AcceptInvitationInput,
  type AuthSession,
  type CommunitySettings,
  type CreatedInvitation,
  type CreateInvitationInputDraft,
  type CreateFeatureInput,
  type CreateLayerInput,
  type CurrentUser,
  type DecideSuggestionInput,
  type Feature,
  type FeatureSuggestion,
  type FeatureStatus,
  type Invitation,
  type InvitationPreview,
  type Layer,
  type LoginInput,
  type ModerateFeatureInput,
  type RegisterInput,
  type SuggestFeatureInput,
  type SuggestionStatus,
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

const decidedSuggestionSchema = z.object({
  suggestion: featureSuggestionSchema,
  feature: featureSchema.nullable(),
});

export const suggestionsApi = {
  list: (status: SuggestionStatus = 'pending'): Promise<FeatureSuggestion[]> =>
    apiRequest(`/api/suggestions?status=${status}`, { schema: z.array(featureSuggestionSchema) }),
  decide: (id: string, input: DecideSuggestionInput) =>
    apiRequest(`/api/suggestions/${id}/decide`, {
      method: 'POST',
      body: input,
      schema: decidedSuggestionSchema,
    }),
};

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
  /* Photo calls answer with the whole contribution, so its status stays current too. */
  addImage: (featureId: string, image: Blob, alt: string): Promise<Feature> =>
    apiRequest(`/api/features/${featureId}/images?alt=${encodeURIComponent(alt)}`, {
      method: 'POST',
      body: image,
      schema: featureSchema,
    }),
  updateImage: (featureId: string, imageId: string, alt: string): Promise<Feature> =>
    apiRequest(`/api/features/${featureId}/images/${imageId}`, {
      method: 'PATCH',
      body: { alt },
      schema: featureSchema,
    }),
  /** A member's suggested change; the place itself stays as it is until approved. */
  suggest: (id: string, input: SuggestFeatureInput): Promise<FeatureSuggestion> =>
    apiRequest(`/api/features/${id}/suggestions`, {
      method: 'POST',
      body: input,
      schema: featureSuggestionSchema,
    }),
  removeImage: (featureId: string, imageId: string): Promise<Feature> =>
    apiRequest(`/api/features/${featureId}/images/${imageId}`, {
      method: 'DELETE',
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
  uploadAvatar: (image: Blob): Promise<CurrentUser> =>
    apiRequest('/api/auth/me/avatar', { method: 'PUT', body: image, schema: currentUserSchema }),
  removeAvatar: (): Promise<CurrentUser> =>
    apiRequest('/api/auth/me/avatar', { method: 'DELETE', schema: currentUserSchema }),
  /* The invitation token always travels in the body, never in a URL. */
  previewInvitation: (token: string): Promise<InvitationPreview> =>
    apiRequest('/api/auth/invitations/preview', {
      method: 'POST',
      body: { token },
      schema: invitationPreviewSchema,
    }),
  acceptInvitation: (input: AcceptInvitationInput): Promise<AuthSession> =>
    apiRequest('/api/auth/invitations/accept', {
      method: 'POST',
      body: input,
      schema: authSessionSchema,
    }),
};

const invitationListSchema = z.array(invitationSchema);

export const invitationsApi = {
  list: (): Promise<Invitation[]> =>
    apiRequest('/api/invitations', { schema: invitationListSchema }),
  create: (input: CreateInvitationInputDraft): Promise<CreatedInvitation> =>
    apiRequest('/api/invitations', {
      method: 'POST',
      body: input,
      schema: createdInvitationSchema,
    }),
  revoke: (id: string): Promise<void> => apiRequest(`/api/invitations/${id}`, { method: 'DELETE' }),
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
  setDisabled: (id: string, disabled: boolean): Promise<CurrentUser> =>
    apiRequest(`/api/users/${id}/status`, {
      method: 'PATCH',
      body: { disabled },
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
