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
import { mdiChevronLeft, mdiChevronRight, mdiFilterVariant, mdiPlus } from '@mdi/js';
import { useQueryClient } from '@tanstack/vue-query';
import { useTranslation } from 'i18next-vue';
import { computed, nextTick, ref, shallowRef, useId, useTemplateRef, watch } from 'vue';
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
import MapCanvas from '../map/MapCanvas.vue';
import MapSidePanel from '../map/MapSidePanel.vue';
import { placesInView, type MapView } from '../map/placeList.js';
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

/*
 * On a wide screen the side panel can slide away to give the map the full
 * width. The choice is remembered in this browser only - a convenience, so it
 * may be unavailable (private window, blocked storage) without harm.
 */
const PANEL_STORAGE_KEY = 'ecomap.sidePanelHidden';
const readPanelHidden = (): boolean => {
  try {
    return localStorage.getItem(PANEL_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};
const panelHidden = ref(readPanelHidden());
const sidebarId = useId();
const togglePanel = (): void => {
  panelHidden.value = !panelHidden.value;
  try {
    localStorage.setItem(PANEL_STORAGE_KEY, String(panelHidden.value));
  } catch {
    /* Not remembered; it still works for this visit. */
  }
};
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

const mapCanvas = useTemplateRef<{
  centerPosition: () => Position | null;
  focusFeature: (id: string) => void;
}>('mapCanvas');

/*
 * The places on screen, for the list beside the map: what the map shows,
 * nearest first - to the person once they have used "show my location".
 */
const mapView = shallowRef<MapView | null>(null);
const userPosition = shallowRef<[number, number] | null>(null);
const listed = computed(() =>
  mapView.value
    ? placesInView(features.value, mapView.value, userPosition.value)
    : { places: [], total: 0 },
);

/** Which place was opened from the list, so closing it returns focus there. */
const openedFromList = ref<string | null>(null);

const selectFromMap = (feature: Feature): void => {
  openedFromList.value = null;
  selectFeature(feature);
};

const selectFromList = (feature: Feature): void => {
  openedFromList.value = feature.id;
  /* On a phone the list is in a drawer; close it so the place can be seen. */
  sidebarOpen.value = false;
  selectFeature(feature);
};

/** Closing the details hands focus back to where the place was opened from. */
const closeDetails = (): void => {
  const id = selectedFeatureId.value;
  const backToList = id !== null && id === openedFromList.value && isDesktop.value;
  if (id && !backToList) mapCanvas.value?.focusFeature(id);
  selectFeature(null);
  if (backToList) {
    void nextTick(() => {
      document.querySelector<HTMLElement>(`[data-place-id="${CSS.escape(id)}"]`)?.focus();
    });
  }
};

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

/** Keyboard placing: a point where the crosshair in the middle of the map is. */
const placeAtCenter = (): void => {
  const position = mapCanvas.value?.centerPosition();
  if (position) placePosition(position);
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
  focusAddButton();
};

/**
 * Dialogs and the drawing bar opened from code have no button to hand focus
 * back to, so after adding (or giving up) it goes to the add button - never
 * lost on the page body. Opening the new place moves it on from there.
 */
function focusAddButton(): void {
  void nextTick(() => {
    document.querySelector<HTMLElement>('.map-actions .add-button')?.focus();
  });
}

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
  focusAddButton();
};

const cancelStart = (): void => {
  startDialogOpen.value = false;
  focusAddButton();
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
      :id="sidebarId"
      :aria-label="t('placeList.panel')"
      class="map-sidebar"
      :class="{ 'map-sidebar--hidden': panelHidden }"
      :style="{ width: panelHidden ? '0px' : `${SIDEBAR_WIDTH}px` }"
    >
      <!-- A fixed width inside, so the content slides rather than squeezes. -->
      <div class="map-sidebar-inner" :style="{ width: `${SIDEBAR_WIDTH}px` }">
        <MapSidePanel
          v-model:search-draft="searchDraft"
          :layers="layers"
          :filters="filters"
          :shown="features.length"
          :total="featuresQuery.data.value?.total ?? 0"
          :matches="searchMatches"
          :places="listed.places"
          :places-total="listed.total"
          :layers-by-slug="layersBySlug"
          :from-person="userPosition !== null"
          @update:filters="applyFilters"
          @select="selectFromList"
        />
      </div>
    </aside>
    <!-- Every filter change rewrites the query; that must not close the drawer. -->
    <v-navigation-drawer
      v-else
      v-model="sidebarOpen"
      temporary
      disable-route-watcher
      :width="SIDEBAR_WIDTH"
    >
      <MapSidePanel
        v-model:search-draft="searchDraft"
        :layers="layers"
        :filters="filters"
        :shown="features.length"
        :total="featuresQuery.data.value?.total ?? 0"
        :matches="searchMatches"
        :places="listed.places"
        :places-total="listed.total"
        :layers-by-slug="layersBySlug"
        :from-person="userPosition !== null"
        @update:filters="applyFilters"
        @select="selectFromList"
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

      <!-- A tab on the panel's edge: hides it, or brings it back. -->
      <v-btn
        v-if="isDesktop && !drawing"
        class="panel-toggle"
        variant="flat"
        color="surface"
        size="small"
        :aria-label="panelHidden ? t('map.showPanel') : t('map.hidePanel')"
        :title="panelHidden ? t('map.showPanel') : t('map.hidePanel')"
        :aria-expanded="!panelHidden"
        :aria-controls="sidebarId"
        @click="togglePanel"
      >
        <v-icon :icon="panelHidden ? mdiChevronRight : mdiChevronLeft" />
      </v-btn>

      <h1 class="d-sr-only">{{ t('map.pageHeading', { name: settings?.name ?? 'EcoMap' }) }}</h1>

      <DrawingToolbar
        v-if="drawing"
        :drawing="drawing"
        :can-finish="canFinish"
        :moving="editing !== null"
        @finish="finishDrawing"
        @undo="undo"
        @reset="reset"
        @cancel="cancelDrawingOrMove"
        @place-at-center="placeAtCenter"
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
          class="add-button"
          size="x-large"
          color="cta"
          elevation="6"
          :aria-label="t('map.addContribution')"
          :disabled="isDrawing || contributableLayers.length === 0"
          @click="startDialogOpen = true"
        />
        <!-- Eager: the hint exists before it is shown, so the button can point at its text. -->
        <v-tooltip v-else :text="t('map.addContributionHint')" location="top" eager>
          <template #activator="{ props: activator }">
            <v-btn
              v-bind="activator"
              color="cta"
              variant="flat"
              elevation="6"
              size="large"
              :prepend-icon="mdiPlus"
              class="add-button"
              to="/sign-in"
            >
              {{ t('map.addContribution') }}
            </v-btn>
          </template>
        </v-tooltip>
      </div>

      <!--
        After the controls above in the page order, though drawn beneath them:
        keyboard users reach the topics and buttons before every place on the map.
      -->
      <MapCanvas
        ref="mapCanvas"
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
        @select-feature="selectFromMap"
        @view-change="(view: MapView) => (mapView = view)"
        @located="(position: [number, number]) => (userPosition = position)"
        @draw-position="placePosition"
      />
    </div>

    <StartDrawingDialog
      :open="startDialogOpen"
      :layers="contributableLayers"
      @start="startDrawing"
      @cancel="cancelStart"
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
      @close="closeDetails"
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
  transition: width 0.2s ease;
}

.map-sidebar-inner {
  height: 100%;
}

/* Hidden also from the keyboard and screen readers, once it has slid away. */
.map-sidebar--hidden {
  visibility: hidden;
  border-right-width: 0;
  transition:
    width 0.2s ease,
    visibility 0s 0.2s;
}

@media (prefers-reduced-motion: reduce) {
  .map-sidebar,
  .map-sidebar--hidden {
    transition: none;
  }
}

/* Clear of Leaflet's zoom buttons (top left) and the topic chips (top). */
.panel-toggle {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1000;
  border-radius: 0 8px 8px 0;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-left: 0;
  min-width: 0;
  padding: 0 1px;
  height: 48px !important;
  transition: padding 0.15s ease;
}

/* It grows out of the edge under the pointer or keyboard focus. */
.panel-toggle:hover,
.panel-toggle:focus-visible {
  padding: 0 1px 0 7px;
}

@media (prefers-reduced-motion: reduce) {
  .panel-toggle {
    transition: none;
  }
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
