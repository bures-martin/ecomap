import type {
  CreateFeatureInput,
  CreateInvitationInputDraft,
  CreateLayerInput,
  Feature,
  DecideSuggestionInput,
  ModerateFeatureInput,
  Role,
  SuggestFeatureInput,
  UpdateCommunitySettingsInput,
  UpdateFeatureInput,
  UpdateLayerInput,
} from '@ecomap/shared';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import {
  featuresApi,
  invitationsApi,
  layersApi,
  settingsApi,
  suggestionsApi,
  usersApi,
} from './endpoints.js';
import { filtersKey, type MapFilters } from '../map/filters.js';

/** Query keys in one place, so an invalidation can never miss a cache entry. */
export const queryKeys = {
  settings: ['settings'] as const,
  layers: ['layers'] as const,
  users: ['users'] as const,
  invitations: ['invitations'] as const,
  suggestions: ['suggestions'] as const,
  features: (filters: MapFilters) => ['features', filtersKey(filters)] as const,
  feature: (id: string) => ['feature', id] as const,
};

export function useCommunitySettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => settingsApi.get(),
    /* Branding changes rarely; refetching it on every focus is wasted traffic. */
    staleTime: 5 * 60_000,
  });
}

export function useLayers() {
  return useQuery({
    queryKey: queryKeys.layers,
    queryFn: () => layersApi.list(),
    staleTime: 60_000,
  });
}

/** Refetches whenever the (reactive) filters change; waits while `enabled` is false. */
export function useFeatures(
  filters: MaybeRefOrGetter<MapFilters>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  return useQuery({
    queryKey: computed(() => queryKeys.features(toValue(filters))),
    queryFn: ({ signal }) => featuresApi.list(toValue(filters), signal),
    enabled: computed(() => toValue(enabled)),
    /* Keeps the previous points on screen while a filter change loads. */
    placeholderData: keepPreviousData,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCommunitySettingsInput) => settingsApi.update(input),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.settings, settings);
    },
  });
}

export function useCreateLayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLayerInput) => layersApi.create(input),
    onSuccess: () => invalidateLayers(queryClient),
  });
}

export function useUpdateLayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateLayerInput }) =>
      layersApi.update(id, input),
    onSuccess: () => invalidateLayers(queryClient),
  });
}

export function useDeleteLayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, confirm }: { id: string; confirm: boolean }) =>
      layersApi.remove(id, confirm),
    onSuccess: async () => {
      await invalidateLayers(queryClient);
      await queryClient.invalidateQueries({ queryKey: ['features'] });
    },
  });
}

export function useCreateFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFeatureInput) => featuresApi.create(input),
    onSuccess: () => invalidateFeatures(queryClient),
  });
}

export function useUpdateFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFeatureInput }) =>
      featuresApi.update(id, input),
    onSuccess: (feature) => {
      queryClient.setQueryData<Feature>(queryKeys.feature(feature.id), feature);
      return invalidateFeatures(queryClient);
    },
  });
}

export function useDeleteFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => featuresApi.remove(id),
    onSuccess: () => invalidateFeatures(queryClient),
  });
}

export function useModerateFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ModerateFeatureInput }) =>
      featuresApi.moderate(id, input),
    onSuccess: () => invalidateFeatures(queryClient),
  });
}

/** Suggests a change; nothing on the map moves until a moderator approves it. */
export function useSuggestEdit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SuggestFeatureInput }) =>
      featuresApi.suggest(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.suggestions }),
  });
}

export function useSuggestions(enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: queryKeys.suggestions,
    queryFn: () => suggestionsApi.list(),
    enabled: computed(() => toValue(enabled)),
  });
}

export function useDecideSuggestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DecideSuggestionInput }) =>
      suggestionsApi.decide(id, input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.suggestions }),
        invalidateFeatures(queryClient),
      ]),
  });
}

export function useInvitations(enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: queryKeys.invitations,
    queryFn: () => invitationsApi.list(),
    enabled: computed(() => toValue(enabled)),
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvitationInputDraft) => invitationsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.invitations }),
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invitationsApi.revoke(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.invitations }),
  });
}

export function useSetUserDisabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, disabled }: { id: string; disabled: boolean }) =>
      usersApi.setDisabled(id, disabled),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.users }),
        /* A blocked admin's open invitations are withdrawn with them. */
        queryClient.invalidateQueries({ queryKey: queryKeys.invitations }),
      ]),
  });
}

/** A temporary password for someone who is locked out; the answer holds it once. */
export function useCreateTemporaryPassword() {
  return useMutation({
    mutationFn: (id: string) => usersApi.createTemporaryPassword(id),
  });
}

export function useUsers() {
  return useQuery({ queryKey: queryKeys.users, queryFn: () => usersApi.list() });
}

export function useSetUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => usersApi.setRole(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users }),
  });
}

/** Layer edits change the counts shown on features, so both caches go stale. */
async function invalidateLayers(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: queryKeys.layers });
}

async function invalidateFeatures(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['features'] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.layers }),
  ]);
}
