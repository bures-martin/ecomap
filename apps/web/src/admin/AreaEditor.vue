<script setup lang="ts">
import {
  areaBBox,
  areaFromBBox,
  areaFromCorners,
  isRingSimple,
  openRing,
  type Basemap,
  type ContributionArea,
  type MapView,
  type Position,
} from '@ecomap/shared';
import {
  mdiCheck,
  mdiClose,
  mdiCropFree,
  mdiDeleteOutline,
  mdiFitToScreenOutline,
  mdiPencilOutline,
  mdiUndo,
} from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import L from 'leaflet';
import { computed, onBeforeUnmount, onMounted, ref, useId, useTemplateRef, watch } from 'vue';
import { basemapDefinition } from '../map/basemaps.js';
import { toLatLng } from '../map/geo.js';

/**
 * Lets an admin draw the region contributions are allowed in.
 *
 * Click to place corners, drag a corner to move it, drag one of the small
 * midpoint handles to add a corner there, double-click a corner to remove it.
 * "Use the visible map" turns whatever is on screen into a rectangle - the
 * quickest start, and the way to set an area without a mouse.
 */
const area = defineModel<ContributionArea | null>({ required: true });
const props = defineProps<{ basemap: Basemap; initialView: MapView; color: string }>();

const { t } = useTranslation();
const instructionsId = useId();
const container = useTemplateRef<HTMLDivElement>('container');

/** Corners being placed while drawing a new outline; null when not drawing. */
const drafting = ref<Position[] | null>(null);

const corners = computed((): Position[] => (area.value ? openRing(area.value.coordinates[0]) : []));
const crossesItself = computed(() => corners.value.length >= 4 && !isRingSimple(corners.value));
const canFinish = computed(() => (drafting.value?.length ?? 0) >= 3);

let map: L.Map | null = null;
let tiles: L.TileLayer | null = null;
const shapes = L.layerGroup();
const handles = L.layerGroup();

/** Six decimals is about 10 cm - plenty, and it keeps the stored outline small. */
const round = (value: number): number => Math.round(value * 1e6) / 1e6;
const toPosition = (latlng: L.LatLng): Position => [round(latlng.lng), round(latlng.lat)];

const setCorners = (next: Position[]): void => {
  area.value = next.length >= 3 ? areaFromCorners(next) : null;
};

/* ------------------------------------------------------------- map ---- */

onMounted(() => {
  if (!container.value) return;
  map = L.map(container.value, {
    center: [props.initialView.lat, props.initialView.lng],
    zoom: props.initialView.zoom,
    scrollWheelZoom: true,
    doubleClickZoom: false,
  });
  shapes.addTo(map);
  handles.addTo(map);

  map.on('click', (event: L.LeafletMouseEvent) => {
    if (drafting.value) drafting.value = [...drafting.value, toPosition(event.latlng)];
  });

  watch(() => props.basemap, showBasemap, { immediate: true });
  watch([corners, drafting], render, { immediate: true });
  if (area.value) fitToArea();
});

onBeforeUnmount(() => {
  map?.remove();
  map = null;
});

function showBasemap(basemap: Basemap): void {
  if (!map) return;
  tiles?.remove();
  const definition = basemapDefinition(basemap);
  tiles = L.tileLayer(definition.url, {
    attribution: definition.attribution,
    maxZoom: definition.maxZoom,
    ...(definition.subdomains ? { subdomains: definition.subdomains } : {}),
  }).addTo(map);
}

function handleIcon(kind: 'corner' | 'midpoint'): L.DivIcon {
  const size = kind === 'corner' ? 14 : 10;
  return L.divIcon({
    className: `area-handle area-handle--${kind}`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function render(): void {
  shapes.clearLayers();
  handles.clearLayers();
  if (!map) return;

  /* Drawing a new outline: just the path so far, and its corners. */
  if (drafting.value) {
    const path = drafting.value.map(toLatLng);
    if (path.length > 1) {
      shapes.addLayer(
        L.polyline(path, { color: props.color, weight: 3, dashArray: '6 6', interactive: false }),
      );
    }
    for (const corner of path) {
      handles.addLayer(L.marker(corner, { icon: handleIcon('corner'), interactive: false }));
    }
    return;
  }

  const ring = corners.value;
  if (ring.length < 3) return;

  shapes.addLayer(
    L.polygon(ring.map(toLatLng), {
      color: crossesItself.value ? '#c53030' : props.color,
      weight: 3,
      fillOpacity: 0.12,
      interactive: false,
    }),
  );

  ring.forEach((corner, index) => {
    const marker = L.marker(toLatLng(corner), {
      icon: handleIcon('corner'),
      draggable: true,
      keyboard: false,
      title: t('settingsAdmin.area.cornerHint'),
    });
    marker.on('dragend', () => {
      const next = [...ring];
      next[index] = toPosition(marker.getLatLng());
      setCorners(next);
    });
    marker.on('dblclick', (event: L.LeafletMouseEvent) => {
      L.DomEvent.stop(event);
      if (ring.length > 3) setCorners(ring.filter((_, i) => i !== index));
    });
    handles.addLayer(marker);

    /* Midpoint of the edge to the next corner: drag it to add a corner there. */
    const following = ring[(index + 1) % ring.length] ?? corner;
    const midpoint: Position = [(corner[0] + following[0]) / 2, (corner[1] + following[1]) / 2];
    const mid = L.marker(toLatLng(midpoint), {
      icon: handleIcon('midpoint'),
      draggable: true,
      keyboard: false,
      title: t('settingsAdmin.area.midpointHint'),
    });
    mid.on('dragend', () => {
      const next = [...ring];
      next.splice(index + 1, 0, toPosition(mid.getLatLng()));
      setCorners(next);
    });
    handles.addLayer(mid);
  });
}

/* ---------------------------------------------------------- actions ---- */

const startDrawing = (): void => {
  drafting.value = [];
};

const undoCorner = (): void => {
  if (drafting.value) drafting.value = drafting.value.slice(0, -1);
};

const cancelDrawing = (): void => {
  drafting.value = null;
};

const finishDrawing = (): void => {
  if (!drafting.value || drafting.value.length < 3) return;
  setCorners(drafting.value);
  drafting.value = null;
};

const useVisibleMap = (): void => {
  if (!map) return;
  const bounds = map.getBounds();
  drafting.value = null;
  area.value = areaFromBBox([
    round(bounds.getWest()),
    round(bounds.getSouth()),
    round(bounds.getEast()),
    round(bounds.getNorth()),
  ]);
};

const removeArea = (): void => {
  drafting.value = null;
  area.value = null;
};

function fitToArea(): void {
  if (!map || !area.value) return;
  const [west, south, east, north] = areaBBox(area.value);
  map.fitBounds(
    [
      [south, west],
      [north, east],
    ],
    { padding: [24, 24] },
  );
}
</script>

<template>
  <div class="d-flex flex-column ga-3">
    <div class="d-flex flex-wrap ga-2">
      <template v-if="drafting">
        <v-btn
          color="primary"
          variant="flat"
          size="small"
          :prepend-icon="mdiCheck"
          :disabled="!canFinish"
          @click="finishDrawing"
        >
          {{ t('settingsAdmin.area.finish') }}
        </v-btn>
        <v-btn
          variant="text"
          size="small"
          :prepend-icon="mdiUndo"
          :disabled="drafting.length === 0"
          @click="undoCorner"
        >
          {{ t('draw.undoPoint') }}
        </v-btn>
        <v-btn variant="text" size="small" :prepend-icon="mdiClose" @click="cancelDrawing">
          {{ t('app.cancel') }}
        </v-btn>
      </template>
      <template v-else>
        <v-btn
          variant="outlined"
          color="primary"
          size="small"
          :prepend-icon="mdiPencilOutline"
          @click="startDrawing"
        >
          {{ area ? t('settingsAdmin.area.redraw') : t('settingsAdmin.area.draw') }}
        </v-btn>
        <v-btn variant="text" size="small" :prepend-icon="mdiCropFree" @click="useVisibleMap">
          {{ t('settingsAdmin.area.useVisible') }}
        </v-btn>
        <v-btn
          v-if="area"
          variant="text"
          size="small"
          :prepend-icon="mdiFitToScreenOutline"
          @click="fitToArea"
        >
          {{ t('settingsAdmin.area.zoomTo') }}
        </v-btn>
        <v-btn
          v-if="area"
          variant="text"
          size="small"
          color="error"
          :prepend-icon="mdiDeleteOutline"
          @click="removeArea"
        >
          {{ t('settingsAdmin.area.remove') }}
        </v-btn>
      </template>
    </div>

    <div
      ref="container"
      class="area-map"
      :class="{ 'area-map--drawing': drafting }"
      role="region"
      :aria-label="t('settingsAdmin.area.mapLabel')"
      :aria-describedby="instructionsId"
    />

    <p :id="instructionsId" class="text-body-small text-medium-emphasis" aria-live="polite">
      <template v-if="drafting">
        {{ t('settingsAdmin.area.drawingHint', { count: drafting.length }) }}
      </template>
      <template v-else-if="area">
        {{ t('settingsAdmin.area.editHint', { count: corners.length }) }}
      </template>
      <template v-else>{{ t('settingsAdmin.area.none') }}</template>
    </p>

    <v-alert v-if="crossesItself && !drafting" type="warning" density="compact">
      {{ t('settingsAdmin.area.crosses') }}
    </v-alert>
  </div>
</template>

<style scoped>
.area-map {
  height: 420px;
  border-radius: 8px;
  overflow: hidden;
}

.area-map--drawing :deep(.leaflet-container),
.area-map--drawing {
  cursor: crosshair;
}
</style>
