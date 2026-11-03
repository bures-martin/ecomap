<script setup lang="ts">
import {
  openRing,
  type Basemap,
  type ContributionArea,
  type Feature,
  type Layer,
  type Position,
} from '@ecomap/shared';
import { useTranslation } from 'i18next-vue';
import L from 'leaflet';
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue';
import { addBasemap } from './basemaps.js';
import { toLatLng } from './geo.js';
import { markerIcon } from './markerIcon.js';
import type { DrawingState } from './useDrawing.js';

/**
 * The Leaflet map, driven directly rather than through a wrapper library: the
 * props are watched and each change is applied to the matching Leaflet layer.
 *
 * GeoJSON is `[lng, lat]` and Leaflet is `[lat, lng]`; the conversion lives in
 * `geo.ts` and nowhere else, which is the one place the mix-up can be caught.
 */
const props = defineProps<{
  basemap: Basemap;
  center: [number, number];
  zoom: number;
  features: readonly Feature[];
  layersBySlug: ReadonlyMap<string, Layer>;
  selectedFeatureId: string | null;
  drawing: DrawingState | null;
  /** The community's region; everything outside it is greyed out. */
  contributionArea: ContributionArea | null;
  areaColor: string;
}>();

const emit = defineEmits<{
  selectFeature: [feature: Feature];
  drawPosition: [position: Position];
}>();

const { t } = useTranslation();
const container = useTemplateRef<HTMLDivElement>('container');

let map: L.Map | null = null;
let removeBasemap: (() => void) | null = null;
const featureLayer = L.layerGroup();
const drawingLayer = L.layerGroup();
const areaLayer = L.layerGroup();

/** Its own pane, below the contributions, so the grey veil never covers or blocks them. */
const AREA_PANE = 'ecomapArea';

/**
 * A rectangle round the whole world, to cut the community's region out of. It
 * stops at 85 degrees: Web Mercator cannot project the poles (they lie at
 * infinity), and a ring that touches them is silently not drawn at all.
 */
const WORLD: L.LatLngExpression[] = [
  [-85, -540],
  [85, -540],
  [85, 540],
  [-85, 540],
];

onMounted(() => {
  if (!container.value) return;

  map = L.map(container.value, {
    center: props.center,
    zoom: props.zoom,
    scrollWheelZoom: true,
  });
  const pane = map.createPane(AREA_PANE);
  pane.style.zIndex = '350';
  pane.style.pointerEvents = 'none';

  areaLayer.addTo(map);
  featureLayer.addTo(map);
  drawingLayer.addTo(map);

  watch(() => [props.contributionArea, props.areaColor] as const, drawArea, { immediate: true });

  map.on('click', (event: L.LeafletMouseEvent) => {
    if (props.drawing) emit('drawPosition', [event.latlng.lng, event.latlng.lat]);
  });

  watch(() => props.basemap, showBasemap, { immediate: true });
  watch(
    () => [props.features, props.layersBySlug, props.selectedFeatureId] as const,
    drawFeatures,
    { immediate: true },
  );
  watch(() => props.drawing, drawDrawing, { immediate: true });

  /*
   * Moves the map when the requested view changes - for instance when a shared
   * link arrives with a feature id, or the admin previews a new start position.
   * Only a deliberate change of target counts, not the user panning.
   */
  watch(
    () => [props.center[0], props.center[1], props.zoom] as const,
    ([lat, lng, zoom]) => {
      map?.setView([lat, lng], zoom, { animate: true });
    },
  );
});

onBeforeUnmount(() => {
  map?.remove();
  map = null;
});

/**
 * The region where contributions are allowed: everything outside it gets a
 * light grey veil and the region itself a dashed border. Panning and zooming
 * stay free - only adding is limited, and the server enforces that.
 */
function drawArea(): void {
  areaLayer.clearLayers();
  const area = props.contributionArea;
  if (!area) return;

  const ring = openRing(area.coordinates[0]).map(toLatLng);
  areaLayer.addLayer(
    L.polygon([WORLD, ring], {
      pane: AREA_PANE,
      stroke: false,
      fillColor: '#5f6b75',
      fillOpacity: 0.3,
      interactive: false,
    }),
  );
  areaLayer.addLayer(
    L.polygon(ring, {
      pane: AREA_PANE,
      color: props.areaColor,
      weight: 2.5,
      dashArray: '8 6',
      fill: false,
      interactive: false,
    }),
  );
}

function showBasemap(basemap: Basemap): void {
  if (!map) return;
  removeBasemap?.();
  removeBasemap = addBasemap(map, basemap);
}

/**
 * Names come from contributors, so tooltips get a text node - never an HTML
 * string, which Leaflet would happily inject as markup.
 */
function textContent(text: string): HTMLElement {
  const span = document.createElement('span');
  span.textContent = text;
  return span;
}

function drawFeatures(): void {
  featureLayer.clearLayers();
  for (const feature of props.features) {
    featureLayer.addLayer(
      featureShape(
        feature,
        props.layersBySlug.get(feature.layerSlug)?.color ?? '#2f855a',
        feature.id === props.selectedFeatureId,
      ),
    );
  }
}

function featureShape(feature: Feature, color: string, selected: boolean): L.Layer {
  const select = (): void => {
    emit('selectFeature', feature);
  };

  /* Unpublished contributions are drawn dashed, so their state is visible. */
  const published = feature.status === 'published';
  const pathOptions: L.PathOptions = {
    color,
    weight: selected ? 6 : 4,
    opacity: published ? 0.9 : 0.55,
    fillOpacity: published ? 0.25 : 0.12,
    ...(published ? {} : { dashArray: '6 6' }),
  };

  switch (feature.geometry.type) {
    case 'Point': {
      const marker = L.marker(toLatLng(feature.geometry.coordinates), {
        icon: markerIcon(color, selected),
        keyboard: true,
        title: feature.name,
      });
      marker.bindTooltip(textContent(feature.name), { direction: 'top' });
      marker.on('click', select);
      marker.on('keypress', (event: L.LeafletKeyboardEvent) => {
        if (event.originalEvent.key === 'Enter' || event.originalEvent.key === ' ') select();
      });
      /* The pin is a focusable div, so it needs its own accessible name. */
      marker.on('add', () => {
        marker.getElement()?.setAttribute('aria-label', feature.name);
      });
      return marker;
    }
    case 'LineString': {
      const line = L.polyline(feature.geometry.coordinates.map(toLatLng), pathOptions);
      line.bindTooltip(textContent(feature.name), { sticky: true });
      line.on('click', select);
      return line;
    }
    case 'Polygon': {
      const polygon = L.polygon(
        feature.geometry.coordinates.map((ring) => ring.map(toLatLng)),
        pathOptions,
      );
      polygon.bindTooltip(textContent(feature.name), { sticky: true });
      polygon.on('click', select);
      return polygon;
    }
  }
}

/** Shows the shape as it is being drawn, in the layer's own colour. */
function drawDrawing(drawing: DrawingState | null): void {
  drawingLayer.clearLayers();
  /* The crosshair makes it obvious the map is waiting for a click. */
  container.value?.classList.toggle('ecomap-drawing', drawing !== null);
  if (!drawing) return;

  const positions = drawing.positions.map(toLatLng);
  const options: L.PolylineOptions = {
    color: drawing.layer.color,
    weight: 4,
    dashArray: '4 6',
    interactive: false,
  };

  for (const position of positions) {
    drawingLayer.addLayer(
      L.marker(position, { icon: markerIcon(drawing.layer.color, true), interactive: false }),
    );
  }
  if (drawing.kind === 'LineString' && positions.length > 1) {
    drawingLayer.addLayer(L.polyline(positions, options));
  }
  if (drawing.kind === 'Polygon' && positions.length > 2) {
    drawingLayer.addLayer(L.polygon(positions, { ...options, fillOpacity: 0.15 }));
  }
}
</script>

<template>
  <!-- Leaflet exposes the map to assistive tech as a labelled region. -->
  <div ref="container" class="map-canvas" role="region" :aria-label="t('map.title')" />
</template>

<style scoped>
.map-canvas {
  height: 100%;
  width: 100%;
}
</style>
