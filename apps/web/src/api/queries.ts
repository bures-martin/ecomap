import type {
  CreateFeatureInput,
  CreateLayerInput,
  Feature,
  ModerateFeatureInput,
  Role,
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
import { featuresApi, layersApi, settingsApi, usersApi } from './endpoints.js';
import { filtersKey, type MapFilters } from '../map/filters.js';

/** Query keys in one place, so an invalidation can never miss a cache entry. */
export const queryKeys = {
  settings: ['settings'] as const,
  layers: ['layers'] as const,
  users: ['users'] as const,
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

/** Refetches whenever the (reactive) filters change. */
export function useFeatures(filters: MaybeRefOrGetter<MapFilters>) {
  return useQuery({
    queryKey: computed(() => queryKeys.features(toValue(filters))),
    queryFn: ({ signal }) => featuresApi.list(toValue(filters), signal),
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
