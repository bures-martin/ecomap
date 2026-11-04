<script setup lang="ts">
import {
  DEFAULT_COMMUNITY_SETTINGS,
  editIsSuggestion,
  isGeometryWithinArea,
  isPositionInArea,
  type Feature,
  type Geometry,
  type GeometryKind,
  type Layer,
  type Position,
  type SuggestFeatureInput,
} from '@ecomap/shared';
import { mdiFilterVariant, mdiPlus } from '@mdi/js';
import { useQueryClient } from '@tanstack/vue-query';
import { useTranslation } from 'i18next-vue';
import { computed, ref, shallowRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import {
  useCommunitySettings,
  useCreateFeature,
  useDeleteFeature,
  useFeatures,
  useLayers,
  useModerateFeature,
  useSuggestEdit,
  useUpdateFeature,
} from '../api/queries.js';
import { useAuth } from '../auth/auth.js';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import { useApiErrorMessage } from '../composables/useApiErrorMessage.js';
import { useDebouncedRef } from '../composables/useDebouncedRef.js';
import { useToast } from '../composables/useToast.js';
import DrawingToolbar from '../map/DrawingToolbar.vue';
import TopicChips from '../map/TopicChips.vue';
import WelcomeCard from '../map/WelcomeCard.vue';
import FeatureDetailsPanel from '../map/FeatureDetailsPanel.vue';
import FeatureFormDialog from '../map/FeatureFormDialog.vue';
import type { FeatureFormValues } from '../map/featureForm.js';
import { readFilters, writeFilters, type MapFilters } from '../map/filters.js';
import { featureCenter } from '../map/geo.js';
import LayerFilterPanel from '../map/LayerFilterPanel.vue';
import MapCanvas from '../map/MapCanvas.vue';
import { fromSearchParams, toSearchParams } from '../map/routeQuery.js';
import StartDrawingDialog from '../map/StartDrawingDialog.vue';
import { hasPhotoChanges, syncPhotos, type PhotoChanges } from '../map/photos.js';
import { useDrawing } from '../map/useDrawing.js';

const SIDEBAR_WIDTH = 320;

/**
 * The map, its filters and the whole contribute flow.
 *
 * Filter state is read from and written to the URL rather than held in this
 * component, so a filtered map is a link somebody can send to a neighbour.
 */
const { t } = useTranslation();
const { mdAndUp: isDesktop } = useDisplay();
const toast = useToast();
const queryClient = useQueryClient();
const errorMessage = useApiErrorMessage();
const auth = useAuth();
const route = useRoute();
const router = useRouter();

const searchParams = computed(() => toSearchParams(route.query));
const filters = computed(() => readFilters(searchParams.value));

const replaceSearchParams = (change: (params: URLSearchParams) => URLSearchParams): void => {
  void router.replace({ query: fromSearchParams(change(searchParams.value)) });
};

/* The search box updates as you type; the URL and the request wait for a pause. */
const searchDraft = ref(filters.value.q);
const debouncedSearch = useDebouncedRef(searchDraft, 300, filters.value.q);

const settingsQuery = useCommunitySettings();
const layersQuery = useLayers();

/*
 * What the map shows: the URL's filters with the typed search, and the layers
 * resolved against each layer's "show when the map opens" setting. Places
 * wait for the layer list, so a layer that starts switched off never flashes
 * up for a moment first.
 */
const activeFilters = computed((): MapFilters => ({ ...filters.value, q: debouncedSearch.value }));
/* No layer ticked asks for every layer - the API's meaning of an empty list. */
const featuresQuery = useFeatures(
  () => activeFilters.value,
  () => layersQuery.data.value !== undefined,
);

const sidebarOpen = ref(false);
const startDialogOpen = ref(false);
const formOpen = ref(false);
const pendingGeometry = shallowRef<Geometry | null>(null);
const editing = shallowRef<Feature | null>(null);
const deleting = shallowRef<Feature | null>(null);

const {
  drawing,
  isDrawing,
  canFinish,
  start: startDrawingState,
  addPosition,
  undo,
  reset,
  cancel: cancelDrawing,
  toGeometry,
} = useDrawing();
const createFeature = useCreateFeature();
const updateFeature = useUpdateFeature();
const suggestEdit = useSuggestEdit();
const deleteFeature = useDeleteFeature();
const moderateFeature = useModerateFeature();

const settings = computed(() => settingsQuery.data.value);
const layers = computed(() => layersQuery.data.value ?? []);
const features = computed(() => featuresQuery.data.value?.features ?? []);

/** Matches per layer while searching, for the layer list; null when not searching. */
const searchMatches = computed((): ReadonlyMap<string, number> | null => {
  if (!filters.value.q.trim()) return null;
  const counts = new Map<string, number>();
  for (const feature of features.value) {
    counts.set(feature.layerSlug, (counts.get(feature.layerSlug) ?? 0) + 1);
  }
  return counts;
});
const layersBySlug = computed(() => new Map(layers.value.map((layer) => [layer.slug, layer])));
const contributableLayers = computed(() => layers.value.filter((layer) => layer.isPublished));

const selectedFeatureId = computed(() => searchParams.value.get('feature'));
const selectedFeature = computed(
  () => features.value.find((feature) => feature.id === selectedFeatureId.value) ?? null,
);

/* Keep the search box in step when the URL changes underneath us (back button). */
watch(
  () => filters.value.q,
  (q) => {
    if (searchDraft.value !== q) searchDraft.value = q;
  },
);

const applyFilters = (next: MapFilters): void => {
  replaceSearchParams((params) => writeFilters(next, params));
};

/* Push the debounced search term into the URL once typing settles. */
watch(debouncedSearch, (q) => {
  if (q !== filters.value.q) applyFilters({ ...filters.value, q });
});

const selectFeature = (feature: Feature | null): void => {
  replaceSearchParams((params) => {
    const next = new URLSearchParams(params);
    if (feature) {
      next.set('feature', feature.id);
    } else {
      next.delete('feature');
    }
    return next;
  });
};

/** Where the map opens: the community's start view. */
const mapCenter = computed((): [number, number] => {
  const view = settings.value?.initialView ?? DEFAULT_COMMUNITY_SETTINGS.initialView;
  return [view.lat, view.lng];
});

/*
 * The selected place, for the map to bring into view. Clicking a place keeps
 * the zoom the person chose; a shared link that opens on one place zooms in
 * close to it once, since that visitor came for that place.
 */
const SHARED_LINK_ZOOM = 14;
const sharedLinkFeatureId = selectedFeatureId.value;
const mapFocus = computed(() => {
  const feature = selectedFeature.value;
  if (!feature) return null;
  return {
    id: feature.id,
    position: featureCenter(feature),
    zoom: feature.id === sharedLinkFeatureId ? SHARED_LINK_ZOOM : null,
  };
});

const mapZoom = computed(
  () => settings.value?.initialView.zoom ?? DEFAULT_COMMUNITY_SETTINGS.initialView.zoom,
);

const formLayer = computed(() =>
  editing.value ? layersBySlug.value.get(editing.value.layerSlug) : drawing.value?.layer,
);

/** Editing someone else's place, or one that needs review, sends a suggestion instead. */
const editingIsSuggestion = computed(() => {
  const user = auth.user;
  const layer = formLayer.value;
  if (!editing.value || !layer || !user) return false;
  return editIsSuggestion({ id: user.id, role: user.role }, layer, editing.value);
});

const selectedLayer = computed(() =>
  selectedFeature.value ? layersBySlug.value.get(selectedFeature.value.layerSlug) : undefined,
);

/** From the welcome card: start adding, or sign in first. */
const startAdding = (): void => {
  if (auth.user) startDialogOpen.value = true;
  else void router.push('/sign-in');
};

const startDrawing = (layer: Layer, kind: GeometryKind): void => {
  startDialogOpen.value = false;
  editing.value = null;
  pendingGeometry.value = null;
  startDrawingState(layer, kind);
};

/** Refuses a click outside the community's area straight away, not at the end. */
const placePosition = (position: Position): void => {
  const area = settings.value?.contributionArea;
  if (area && !isPositionInArea(position, area)) {
    toast.showError(t('draw.outsideBounds'));
    return;
  }
  addPosition(position);
};

const finishDrawing = (): void => {
  const geometry = toGeometry();
  if (!geometry) return;

  /* Every corner is inside by now, but a line can still cut across a concave area. */
  const area = settings.value?.contributionArea;
  if (area && !isGeometryWithinArea(geometry, area)) {
    toast.showError(t('draw.outsideBounds'));
    return;
  }

  pendingGeometry.value = geometry;
  formOpen.value = true;
};

const closeForm = (): void => {
  formOpen.value = false;
  pendingGeometry.value = null;
  editing.value = null;
  cancelDrawing();
};

/**
 * Photos are uploaded once the contribution is saved (a new one has no id
 * before that). The form stays in its saving state until they are done, so
 * "added" really means added - photos included.
 */
const savingPhotos = ref(false);

const savePhotos = async (featureId: string, changes: PhotoChanges): Promise<void> => {
  if (!hasPhotoChanges(changes)) return;
  savingPhotos.value = true;
  try {
    const { failed } = await syncPhotos(featureId, changes);
    await queryClient.invalidateQueries({ queryKey: ['features'] });
    if (failed > 0) toast.showError(t('photos.someFailed', { count: failed }));
  } finally {
    savingPhotos.value = false;
  }
};

const submitForm = (values: FeatureFormValues): void => {
  const onError = (error: unknown): void => {
    toast.showError(errorMessage(error));
  };

  if (editing.value && editingIsSuggestion.value) {
    const changes = changedParts(editing.value, values);
    if (Object.keys(changes).length === 0) {
      toast.showSuccess(t('suggestion.nothingChanged'));
      closeForm();
      return;
    }
    suggestEdit.mutate(
      { id: editing.value.id, input: changes },
      {
        onSuccess: () => {
          toast.showSuccess(t('suggestion.sent'));
          closeForm();
        },
        onError,
      },
    );
    return;
  }

  if (editing.value) {
    updateFeature.mutate(
      {
        id: editing.value.id,
        input: {
          name: values.name,
          description: values.description,
          properties: values.properties,
          ...(pendingGeometry.value ? { geometry: pendingGeometry.value } : {}),
        },
      },
      {
        onSuccess: (feature) => {
          void savePhotos(feature.id, values.photos).then(() => {
            toast.showSuccess(t('feature.updated'));
            closeForm();
          });
        },
        onError,
      },
    );
    return;
  }

  const layer = drawing.value?.layer;
  const geometry = pendingGeometry.value;
  if (!layer || !geometry) return;

  createFeature.mutate(
    {
      layerId: layer.id,
      name: values.name,
      description: values.description,
      properties: values.properties,
      geometry,
      isDraft: values.isDraft,
    },
    {
      onSuccess: (feature) => {
        void savePhotos(feature.id, values.photos).then(() => {
          toast.showSuccess(
            feature.status === 'pending' ? t('feature.createdPending') : t('feature.created'),
          );
          closeForm();
          selectFeature(feature);
        });
      },
      onError,
    },
  );
};

/** Only what the member changed, so the moderator sees exactly that. */
function changedParts(feature: Feature, values: FeatureFormValues): SuggestFeatureInput {
  const sameProperties =
    JSON.stringify(sortedEntries(feature.properties)) ===
    JSON.stringify(sortedEntries(values.properties));
  return {
    ...(values.name.trim() !== feature.name ? { name: values.name.trim() } : {}),
    ...(values.description.trim() !== feature.description
      ? { description: values.description.trim() }
      : {}),
    ...(sameProperties ? {} : { properties: values.properties }),
    ...(pendingGeometry.value ? { geometry: pendingGeometry.value } : {}),
  };
}

function sortedEntries(bag: Record<string, unknown>): [string, unknown][] {
  return Object.entries(bag)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b));
}

const confirmDelete = (): void => {
  const target = deleting.value;
  if (!target) return;
  deleteFeature.mutate(target.id, {
    onSuccess: () => {
      toast.showSuccess(t('feature.deleted'));
      selectFeature(null);
      deleting.value = null;
    },
    onError: (error) => {
      toast.showError(errorMessage(error));
      deleting.value = null;
    },
  });
};

/**
 * Moving a point: the map waits for a click on the right spot - satellite view
 * helps - and then the edit form (or the suggestion form) opens with the new
 * position. Navigation follows, as it aims at these coordinates.
 */
const startMoving = (feature: Feature): void => {
  const layer = layersBySlug.value.get(feature.layerSlug);
  if (!layer || feature.geometry.type !== 'Point') return;
  selectFeature(null);
  editing.value = feature;
  pendingGeometry.value = null;
  startDrawingState(layer, 'Point');
  addPosition(feature.geometry.coordinates);
};

const cancelDrawingOrMove = (): void => {
  if (!formOpen.value) editing.value = null;
  cancelDrawing();
};

const startEditing = (feature: Feature): void => {
  editing.value = feature;
  pendingGeometry.value = null;
  formOpen.value = true;
};

const moderate = (feature: Feature, status: 'published' | 'rejected'): void => {
  moderateFeature.mutate(
    { id: feature.id, input: { status } },
    {
      onSuccess: () => {
        toast.showSuccess(
          status === 'published' ? t('moderation.approved') : t('moderation.rejected'),
        );
      },
      onError: (error) => {
        toast.showError(errorMessage(error));
      },
    },
  );
};
</script>

<template>
  <div class="map-page">
    <aside
      v-if="isDesktop"
      :aria-label="t('map.filters')"
      class="map-sidebar"
      :style="{ width: `${SIDEBAR_WIDTH}px` }"
    >
      <LayerFilterPanel
        v-model:search-draft="searchDraft"
        :layers="layers"
        :filters="filters"
        :shown="features.length"
        :total="featuresQuery.data.value?.total ?? 0"
        :matches="searchMatches"
        @update:filters="applyFilters"
      />
    </aside>
    <!-- Every filter change rewrites the query; that must not close the drawer. -->
    <v-navigation-drawer
      v-else
      v-model="sidebarOpen"
      temporary
      disable-route-watcher
      :width="SIDEBAR_WIDTH"
    >
      <LayerFilterPanel
        v-model:search-draft="searchDraft"
        :layers="layers"
        :filters="filters"
        :shown="features.length"
        :total="featuresQuery.data.value?.total ?? 0"
        :matches="searchMatches"
        @update:filters="applyFilters"
      />
    </v-navigation-drawer>

    <div class="map-area">
      <v-progress-linear
        v-if="featuresQuery.isFetching.value"
        indeterminate
        color="primary"
        class="map-progress"
        :aria-label="t('app.loading')"
      />

      <MapCanvas
        :basemap="settings?.basemap ?? DEFAULT_COMMUNITY_SETTINGS.basemap"
        :center="mapCenter"
        :zoom="mapZoom"
        :focus="mapFocus"
        :features="features"
        :layers-by-slug="layersBySlug"
        :selected-feature-id="selectedFeatureId"
        :drawing="drawing"
        :contribution-area="settings?.contributionArea ?? null"
        :area-color="settings?.primaryColor ?? DEFAULT_COMMUNITY_SETTINGS.primaryColor"
        @select-feature="selectFeature"
        @draw-position="placePosition"
      />

      <DrawingToolbar
        v-if="drawing"
        :drawing="drawing"
        :can-finish="canFinish"
        :moving="editing !== null"
        @finish="finishDrawing"
        @undo="undo"
        @reset="reset"
        @cancel="cancelDrawingOrMove"
      />
      <TopicChips v-else :layers="layers" :filters="filters" @update:filters="applyFilters" />

      <!-- Not over a shared link to one place: that visitor came for that place. -->
      <WelcomeCard
        v-if="!selectedFeatureId"
        :community-name="settings?.name ?? 'EcoMap'"
        :tagline="settings?.tagline ?? ''"
        @add="startAdding"
      />

      <div class="map-actions">
        <v-btn
          v-if="!isDesktop"
          :icon="mdiFilterVariant"
          size="large"
          :aria-label="t('map.openLegend')"
          @click="sidebarOpen = true"
        />

        <v-btn
          v-if="auth.user"
          :icon="mdiPlus"
          size="x-large"
          color="primary"
          :aria-label="t('map.addContribution')"
          :disabled="isDrawing || contributableLayers.length === 0"
          @click="startDialogOpen = true"
        />
        <v-tooltip v-else :text="t('map.addContributionHint')" location="top">
          <template #activator="{ props: activator }">
            <v-btn
              v-bind="activator"
              color="primary"
              variant="flat"
              :prepend-icon="mdiPlus"
              to="/sign-in"
            >
              {{ t('map.addContribution') }}
            </v-btn>
          </template>
        </v-tooltip>
      </div>
    </div>

    <StartDrawingDialog
      :open="startDialogOpen"
      :layers="contributableLayers"
      @start="startDrawing"
      @cancel="startDialogOpen = false"
    />

    <FeatureFormDialog
      :open="formOpen"
      :layer="formLayer"
      :geometry="pendingGeometry"
      :existing="editing"
      :suggesting="editingIsSuggestion"
      :submitting="
        createFeature.isPending.value ||
        updateFeature.isPending.value ||
        suggestEdit.isPending.value ||
        savingPhotos
      "
      :error="createFeature.error.value ?? updateFeature.error.value ?? suggestEdit.error.value"
      @submit="submitForm"
      @cancel="closeForm"
    />

    <FeatureDetailsPanel
      :feature="selectedFeature"
      :layer="selectedLayer"
      @close="selectFeature(null)"
      @edit="startEditing"
      @move="startMoving"
      @delete="(feature) => (deleting = feature)"
      @moderate="moderate"
    />

    <ConfirmDialog
      :open="deleting !== null"
      :title="t('feature.deleteConfirmTitle')"
      :body="t('feature.deleteConfirmBody', { name: deleting?.name ?? '' })"
      :confirm-label="t('app.delete')"
      destructive
      @confirm="confirmDelete"
      @cancel="deleting = null"
    />
  </div>
</template>

<style scoped>
.map-page {
  display: flex;
  flex: 1;
  min-height: 0;
  position: relative;
}

.map-sidebar {
  flex-shrink: 0;
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
}

.map-area {
  flex: 1;
  min-width: 0;
  position: relative;
}

.map-progress {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1200;
}

.map-actions {
  position: absolute;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
</style>
