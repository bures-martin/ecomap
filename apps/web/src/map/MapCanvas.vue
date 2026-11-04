<script setup lang="ts">
import {
  openRing,
  type Basemap,
  type ContributionArea,
  type Feature,
  type Layer,
  type Position,
} from '@ecomap/shared';
import { mdiCrosshairs } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import L from 'leaflet';
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue';
import { addBasemapSwitcher, isBasemap, type BasemapSwitcher } from './basemaps.js';
import { toLatLng } from './geo.js';
import {
  CLUSTER_MAX_ZOOM,
  OPEN_ALL_UP_TO,
  buildPointIndex,
  type PointIndex,
} from './clustering.js';
import { clusterIcon, markerIcon } from './markerIcon.js';
import { addLocateControl, type LocateControl } from './locate.js';
import type { MapView } from './placeList.js';
import type { DrawingState } from './useDrawing.js';
import { useToast } from '../composables/useToast.js';

/**
 * The Leaflet map, driven directly rather than through a wrapper library: the
 * props are watched and each change is applied to the matching Leaflet layer.
 *
 * GeoJSON is `[lng, lat]` and Leaflet is `[lat, lng]`; the conversion lives in
 * `geo.ts` and nowhere else, which is the one place the mix-up can be caught.
 */
const props = defineProps<{
  basemap: Basemap;
  /** The community's start view; changes only when an admin moves it. */
  center: [number, number];
  zoom: number;
  /**
   * A place to bring into view - the selected one. `zoom` null keeps the
   * current zoom; a number zooms in at least that far (a shared link).
   */
  focus: { id: string; position: [number, number]; zoom: number | null } | null;
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
  /** What is on screen, after every pan and zoom - for the list of places. */
  viewChange: [view: MapView];
  /** Where the person is, once "show my location" has found them. */
  located: [position: [number, number]];
}>();

const { t, i18next } = useTranslation();
const toast = useToast();
const container = useTemplateRef<HTMLDivElement>('container');

let map: L.Map | null = null;
/* Someone who asked the system for less motion gets jumps instead of glides. */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let basemaps: BasemapSwitcher | null = null;
let locate: LocateControl | null = null;
/** Routes, areas and the selected place. */
const featureLayer = L.layerGroup();
/** Single places and groups of places, redrawn as the view changes. */
const pointLayer = L.layerGroup();
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
    zoomAnimation: !reduceMotion,
    fadeAnimation: !reduceMotion,
    markerZoomAnimation: !reduceMotion,
  });
  setUpKeyboard(container.value);
  const pane = map.createPane(AREA_PANE);
  pane.style.zIndex = '350';
  pane.style.pointerEvents = 'none';

  areaLayer.addTo(map);
  featureLayer.addTo(map);
  pointLayer.addTo(map);
  drawingLayer.addTo(map);
  /* Zooming ends in a move too, so this covers both. */
  map.on('moveend', drawPoints);
  map.on('moveend', emitView);
  map.on('locationfound', (event: L.LocationEvent) => {
    emit('located', [event.latlng.lat, event.latlng.lng]);
  });
  emitView();

  watch(() => [props.contributionArea, props.areaColor] as const, drawArea, { immediate: true });

  map.on('click', (event: L.LeafletMouseEvent) => {
    if (props.drawing) emit('drawPosition', [event.latlng.lng, event.latlng.lat]);
  });

  /*
   * The community's background map, unless this person picked another one in
   * the switcher - that choice is theirs and is remembered in this browser.
   */
  basemaps = addBasemapSwitcher(
    map,
    pickedBasemap() ?? props.basemap,
    (basemap) => t(`basemaps.${basemap}`),
    rememberBasemap,
  );
  watch(
    () => props.basemap,
    (basemap) => {
      if (!pickedBasemap()) basemaps?.show(basemap);
    },
  );
  i18next.on('languageChanged', relabelBasemaps);

  locate = addLocateControl(map, t('map.locate'), (failure) => {
    toast.showError(t(failure === 'denied' ? 'map.locateDenied' : 'map.locateFailed'));
  });
  labelControls();

  watch(
    () => [props.features, props.layersBySlug, props.selectedFeatureId] as const,
    drawFeatures,
    { immediate: true },
  );
  watch(() => props.drawing, drawDrawing, { immediate: true });

  /*
   * Moves to a new start view when an admin changes it. Only a deliberate
   * change of target counts, never the person's own panning.
   */
  watch(
    () => [props.center[0], props.center[1], props.zoom] as const,
    ([lat, lng, zoom]) => {
      map?.setView([lat, lng], zoom, { animate: !reduceMotion });
    },
  );

  /*
   * Brings the selected place into view. It pans, keeping the zoom the person
   * chose; only a shared link asks to zoom in. Closing the place (focus back
   * to null) leaves the map exactly where it is.
   */
  watch(
    () => props.focus,
    (focus, previous) => {
      if (!map || !focus || focus.id === previous?.id) return;
      if (focus.zoom === null) {
        map.panTo(focus.position, { animate: !reduceMotion });
      } else {
        map.setView(focus.position, Math.max(map.getZoom(), focus.zoom), {
          animate: !reduceMotion,
        });
      }
    },
    { immediate: true },
  );
});

onBeforeUnmount(() => {
  i18next.off('languageChanged', relabelBasemaps);
  locate?.remove();
  locate = null;
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

const BASEMAP_STORAGE_KEY = 'ecomap.basemap';

function pickedBasemap(): Basemap | null {
  try {
    const stored = localStorage.getItem(BASEMAP_STORAGE_KEY);
    return isBasemap(stored) ? stored : null;
  } catch {
    /* Storage blocked: the community's map it is. */
    return null;
  }
}

function rememberBasemap(basemap: Basemap): void {
  try {
    localStorage.setItem(BASEMAP_STORAGE_KEY, basemap);
  } catch {
    /* Not remembered across visits, but switched for now. */
  }
}

function relabelBasemaps(): void {
  basemaps?.relabel();
  locate?.setLabel(t('map.locate'));
  labelControls();
}

/** Leaflet's own controls speak English; these give them the app's words. */
function labelControls(): void {
  const root = container.value;
  if (!root) return;
  const label = (selector: string, text: string): void => {
    for (const element of root.querySelectorAll<HTMLElement>(selector)) {
      element.title = text;
      element.setAttribute('aria-label', text);
    }
  };
  label('.leaflet-control-zoom-in', t('map.zoomIn'));
  label('.leaflet-control-zoom-out', t('map.zoomOut'));
  label('.leaflet-control-layers-toggle', t('map.backgroundMap'));
  label('.leaflet-control-layers-list', t('map.backgroundMap'));
}

function emitView(): void {
  if (!map) return;
  const bounds = map.getBounds();
  const center = map.getCenter();
  emit('viewChange', {
    south: bounds.getSouth(),
    west: bounds.getWest(),
    north: bounds.getNorth(),
    east: bounds.getEast(),
    center: [center.lat, center.lng],
  });
}

/** Where a keyboard-placed point goes: the crosshair in the middle of the map. */
function centerPosition(): Position | null {
  if (!map) return null;
  const center = map.getCenter();
  return [center.lng, center.lat];
}
defineExpose({ centerPosition, focusFeature });

/**
 * Makes the map work from the keyboard beyond Leaflet's own arrows and +/-:
 *
 * - The buttons (zoom, my location, background map) come before the places in
 *   the tab order, instead of after every marker on the island.
 * - Space presses a button as Enter does - they are links acting as buttons.
 * - While drawing, Enter on the map itself puts a point at the crosshair.
 */
function setUpKeyboard(root: HTMLElement): void {
  const controls = root.querySelector('.leaflet-control-container');
  if (controls) root.prepend(controls);

  root.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement;
    if (event.key === ' ' && target.matches('.leaflet-control a')) {
      event.preventDefault();
      target.click();
      return;
    }
    if (event.key === 'Enter' && target === root && props.drawing) {
      event.preventDefault();
      const position = centerPosition();
      if (position) emit('drawPosition', position);
    }
  });
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

let pointIndex: PointIndex | null = null;
let featuresById = new Map<string, Feature>();

/**
 * Routes and areas are drawn as they are; points go into the grouping index,
 * except the selected one, which is always drawn on its own.
 */
function drawFeatures(): void {
  featureLayer.clearLayers();
  featuresById = new Map(props.features.map((feature) => [feature.id, feature]));

  for (const feature of props.features) {
    const selected = feature.id === props.selectedFeatureId;
    if (feature.geometry.type === 'Point' && !selected) continue;
    featureLayer.addLayer(featureShape(feature, selected));
  }

  pointIndex = buildPointIndex(props.features, props.selectedFeatureId);
  drawPoints();
}

/** The groups and single places for what is on screen now; redone on every move. */
function drawPoints(): void {
  pointLayer.clearLayers();
  if (!map || !pointIndex) return;

  const bounds = map.getBounds().pad(0.2);
  const groups = pointIndex.getClusters(
    [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
    Math.round(map.getZoom()),
  );

  for (const group of groups) {
    const [lng, lat] = group.geometry.coordinates as [number, number];
    if ('cluster' in group.properties) {
      pointLayer.addLayer(
        clusterMarker(group.properties.cluster_id, group.properties.point_count, [lat, lng]),
      );
      continue;
    }
    const feature = featuresById.get(group.properties.featureId);
    if (feature) pointLayer.addLayer(featureShape(feature, false));
  }
  applyPendingFocus();
}

/**
 * Room kept free round the places when zooming to a group: the topic chips sit
 * over the top of the map and the buttons over its corners.
 */
const FIT_PADDING = L.point(140, 180);

/** Quick: Leaflet's default flight scales with the distance and takes seconds. */
const CLUSTER_FLIGHT: L.ZoomPanOptions = { duration: 0.5 };

/**
 * A badge with the number of places. Clicking a small group flies to show all
 * of its places at once; a big one zooms in until it splits.
 */
function clusterMarker(clusterId: number, count: number, position: L.LatLngTuple): L.Marker {
  const marker = L.marker(position, {
    icon: clusterIcon(count),
    /* Above single pins, which would otherwise cover a badge and swallow its click. */
    zIndexOffset: 1000,
    keyboard: true,
    title: t('map.clusterLabel', { count }),
  });
  const expand = (): void => {
    if (!map || !pointIndex) return;
    /* The zoom at which this group splits - at least one step forward. */
    const splits = Math.min(pointIndex.getClusterExpansionZoom(clusterId), CLUSTER_MAX_ZOOM + 1);
    if (count > OPEN_ALL_UP_TO) {
      map.flyTo(position, splits, CLUSTER_FLIGHT);
      return;
    }
    const bounds = L.latLngBounds(
      pointIndex.getLeaves(clusterId, Number.POSITIVE_INFINITY).map((leaf) => {
        const [lng, lat] = leaf.geometry.coordinates as [number, number];
        return [lat, lng] as L.LatLngTuple;
      }),
    );
    const fits = map.getBoundsZoom(bounds, false, FIT_PADDING);
    map.flyTo(
      bounds.getCenter(),
      Math.min(Math.max(fits, splits), CLUSTER_MAX_ZOOM + 1),
      CLUSTER_FLIGHT,
    );
  };
  marker.on('click', expand);
  marker.on('keypress', (event: L.LeafletKeyboardEvent) => {
    if (event.originalEvent.key === 'Enter' || event.originalEvent.key === ' ') expand();
  });
  marker.on('add', () => {
    marker.getElement()?.setAttribute('aria-label', t('map.clusterLabel', { count }));
  });
  return marker;
}

function featureShape(feature: Feature, selected: boolean): L.Layer {
  const layer = props.layersBySlug.get(feature.layerSlug);
  const color = layer?.color ?? '#2f855a';
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
        icon: markerIcon(color, layer?.icon ?? 'pin', selected),
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
        const element = marker.getElement();
        element?.setAttribute('aria-label', feature.name);
        if (element) element.dataset['featureId'] = feature.id;
      });
      return marker;
    }
    case 'LineString': {
      const line = L.polyline(feature.geometry.coordinates.map(toLatLng), pathOptions);
      line.bindTooltip(textContent(feature.name), { sticky: true });
      line.on('click', select);
      return keyboardShape(line, feature, select);
    }
    case 'Polygon': {
      const polygon = L.polygon(
        feature.geometry.coordinates.map((ring) => ring.map(toLatLng)),
        pathOptions,
      );
      polygon.bindTooltip(textContent(feature.name), { sticky: true });
      polygon.on('click', select);
      return keyboardShape(polygon, feature, select);
    }
  }
}

/**
 * Routes and areas are SVG paths, which Leaflet leaves out of the tab order -
 * unlike pins. This makes each one a named button like a pin: Tab reaches it,
 * Enter or Space opens it, and it is drawn thicker while it has focus.
 */
function keyboardShape<T extends L.Path>(shape: T, feature: Feature, select: () => void): T {
  shape.on('add', () => {
    const element = shape.getElement();
    if (!(element instanceof SVGElement)) return;
    element.setAttribute('tabindex', '0');
    element.setAttribute('role', 'button');
    element.setAttribute('aria-label', feature.name);
    element.dataset['featureId'] = feature.id;
    element.classList.add('ecomap-shape');
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select();
      }
    });
  });
  return shape;
}

/**
 * Gives focus back to a place once its details close. Closing changes the
 * selection and the pins are redrawn - often more than once in quick
 * succession (the new selection, the end of a pan) - and every redraw throws
 * the focused pin away. So for a moment after closing, each redraw puts focus
 * back on the place if it was lost, and leaves it alone if the person has
 * already moved on.
 */
const REFOCUS_WINDOW_MS = 1500;
let pendingFocus: { id: string; until: number } | null = null;
function focusFeature(id: string): void {
  pendingFocus = { id, until: performance.now() + REFOCUS_WINDOW_MS };
}

function applyPendingFocus(): void {
  const root = container.value;
  if (!pendingFocus || !root) return;
  if (performance.now() > pendingFocus.until) {
    pendingFocus = null;
    return;
  }
  const active = document.activeElement;
  /* Lost: on the page body, or still in the details that just closed. */
  const lost = active === null || active === document.body || !root.contains(active);
  if (!lost) return;
  /* Folded into a group by now: the map itself, rather than the page body. */
  const target =
    root.querySelector<HTMLElement | SVGElement>(
      `[data-feature-id="${CSS.escape(pendingFocus.id)}"]`,
    ) ?? root;
  target.focus();
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
      L.marker(position, {
        icon: markerIcon(drawing.layer.color, drawing.layer.icon, true),
        interactive: false,
      }),
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
  <div class="map-canvas-wrap">
    <!-- Leaflet exposes the map to assistive tech as a labelled region. -->
    <div ref="container" class="map-canvas" role="region" :aria-label="t('map.title')" />
    <!--
      While drawing: the spot "place in the middle" and Enter put a point on, so
      someone moving the map with the arrow keys can see where it will land.
    -->
    <svg
      v-if="props.drawing"
      class="map-crosshair"
      viewBox="0 0 24 24"
      width="40"
      height="40"
      aria-hidden="true"
      focusable="false"
    >
      <path :d="mdiCrosshairs" fill="#ffffff" stroke="#ffffff" stroke-width="2.5" />
      <path :d="mdiCrosshairs" fill="#1e2b23" />
    </svg>
  </div>
</template>

<style scoped>
.map-canvas-wrap {
  position: relative;
  height: 100%;
  width: 100%;
}

.map-canvas {
  height: 100%;
  width: 100%;
}

/* Above the places, below Leaflet's buttons; never catches a click. */
.map-crosshair {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 650;
  pointer-events: none;
}
</style>
