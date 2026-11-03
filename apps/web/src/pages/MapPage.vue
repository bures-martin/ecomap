<script setup lang="ts">
import {
  DEFAULT_COMMUNITY_SETTINGS,
  isGeometryWithinArea,
  isPositionInArea,
  type Feature,
  type Geometry,
  type GeometryKind,
  type Layer,
  type Position,
} from '@ecomap/shared';
import { mdiFilterVariant, mdiPlus } from '@mdi/js';
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
  useUpdateFeature,
} from '../api/queries.js';
import { useAuth } from '../auth/auth.js';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import { useApiErrorMessage } from '../composables/useApiErrorMessage.js';
import { useDebouncedRef } from '../composables/useDebouncedRef.js';
import { useToast } from '../composables/useToast.js';
import DrawingToolbar from '../map/DrawingToolbar.vue';
import FeatureDetailsPanel from '../map/FeatureDetailsPanel.vue';
import FeatureFormDialog from '../map/FeatureFormDialog.vue';
import type { FeatureFormValues } from '../map/featureForm.js';
import { readFilters, writeFilters, type MapFilters } from '../map/filters.js';
import { featureCenter } from '../map/geo.js';
import LayerFilterPanel from '../map/LayerFilterPanel.vue';
import MapCanvas from '../map/MapCanvas.vue';
import { fromSearchParams, toSearchParams } from '../map/routeQuery.js';
import StartDrawingDialog from '../map/StartDrawingDialog.vue';
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
const featuresQuery = useFeatures(() => ({ ...filters.value, q: debouncedSearch.value }));

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
const deleteFeature = useDeleteFeature();
const moderateFeature = useModerateFeature();

const settings = computed(() => settingsQuery.data.value);
const layers = computed(() => layersQuery.data.value ?? []);
const features = computed(() => featuresQuery.data.value?.features ?? []);
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

const mapCenter = computed((): [number, number] => {
  if (selectedFeature.value) return featureCenter(selectedFeature.value);
  const view = settings.value?.initialView ?? DEFAULT_COMMUNITY_SETTINGS.initialView;
  return [view.lat, view.lng];
});

const mapZoom = computed(
  () => settings.value?.initialView.zoom ?? DEFAULT_COMMUNITY_SETTINGS.initialView.zoom,
);

const formLayer = computed(() =>
  editing.value ? layersBySlug.value.get(editing.value.layerSlug) : drawing.value?.layer,
);

const selectedLayer = computed(() =>
  selectedFeature.value ? layersBySlug.value.get(selectedFeature.value.layerSlug) : undefined,
);

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

const submitForm = (values: FeatureFormValues): void => {
  const onError = (error: unknown): void => {
    toast.showError(errorMessage(error));
  };

  if (editing.value) {
    updateFeature.mutate(
      {
        id: editing.value.id,
        input: {
          name: values.name,
          description: values.description,
          properties: values.properties,
        },
      },
      {
        onSuccess: () => {
          toast.showSuccess(t('feature.updated'));
          closeForm();
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
        toast.showSuccess(
          feature.status === 'pending' ? t('feature.createdPending') : t('feature.created'),
        );
        closeForm();
        selectFeature(feature);
      },
      onError,
    },
  );
};

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
        @finish="finishDrawing"
        @undo="undo"
        @reset="reset"
        @cancel="cancelDrawing"
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
      :submitting="createFeature.isPending.value || updateFeature.isPending.value"
      :error="createFeature.error.value ?? updateFeature.error.value"
      @submit="submitForm"
      @cancel="closeForm"
    />

    <FeatureDetailsPanel
      :feature="selectedFeature"
      :layer="selectedLayer"
      @close="selectFeature(null)"
      @edit="startEditing"
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
