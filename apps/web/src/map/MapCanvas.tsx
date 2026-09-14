import type { Basemap, Feature, Layer, Position } from '@ecomap/shared';
import { geometryAnchor } from '@ecomap/shared';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { basemapDefinition } from './basemaps.js';
import { markerIcon } from './markerIcon.js';
import type { DrawingState } from './useDrawing.js';

/**
 * The Leaflet map.
 *
 * GeoJSON is `[lng, lat]` and Leaflet is `[lat, lng]`; the conversion happens
 * here and nowhere else, which is the one place the mix-up can be caught.
 */

function toLatLng(position: Position): [number, number] {
  return [position[1], position[0]];
}

export interface MapCanvasProps {
  basemap: Basemap;
  center: [number, number];
  zoom: number;
  features: Feature[];
  layersBySlug: Map<string, Layer>;
  selectedFeatureId: string | null;
  onSelectFeature: (feature: Feature) => void;
  drawing: DrawingState | null;
  onDrawPosition: (position: Position) => void;
}

export function MapCanvas({
  basemap,
  center,
  zoom,
  features,
  layersBySlug,
  selectedFeatureId,
  onSelectFeature,
  drawing,
  onDrawPosition,
}: MapCanvasProps) {
  const { t } = useTranslation();
  const definition = basemapDefinition(basemap);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      style={{ height: '100%', width: '100%' }}
      /* Leaflet exposes the map to assistive tech as a grouped region. */
      aria-label={t('map.title')}
    >
      <TileLayer
        key={basemap}
        url={definition.url}
        attribution={definition.attribution}
        maxZoom={definition.maxZoom}
        {...(definition.subdomains ? { subdomains: definition.subdomains } : {})}
      />

      <ViewSynchroniser center={center} zoom={zoom} />
      <DrawingCursor active={drawing !== null} />
      {drawing && <DrawClickHandler onDrawPosition={onDrawPosition} />}

      {features.map((feature) => (
        <FeatureShape
          key={feature.id}
          feature={feature}
          color={layersBySlug.get(feature.layerSlug)?.color ?? '#2f855a'}
          selected={feature.id === selectedFeatureId}
          onSelect={onSelectFeature}
        />
      ))}

      {drawing && <DrawingPreview drawing={drawing} />}
    </MapContainer>
  );
}

function FeatureShape({
  feature,
  color,
  selected,
  onSelect,
}: {
  feature: Feature;
  color: string;
  selected: boolean;
  onSelect: (feature: Feature) => void;
}) {
  const handlers = {
    click: () => {
      onSelect(feature);
    },
    keypress: (event: { originalEvent: KeyboardEvent }) => {
      if (event.originalEvent.key === 'Enter' || event.originalEvent.key === ' ') {
        onSelect(feature);
      }
    },
  };

  /* Unpublished contributions are drawn dashed, so their state is visible. */
  const pathOptions = {
    color,
    weight: selected ? 6 : 4,
    opacity: feature.status === 'published' ? 0.9 : 0.55,
    fillOpacity: feature.status === 'published' ? 0.25 : 0.12,
    ...(feature.status === 'published' ? {} : { dashArray: '6 6' }),
  };

  switch (feature.geometry.type) {
    case 'Point':
      return (
        <Marker
          position={toLatLng(feature.geometry.coordinates)}
          icon={markerIcon(color, selected)}
          eventHandlers={handlers}
          keyboard
          alt={feature.name}
        >
          <Tooltip direction="top">{feature.name}</Tooltip>
        </Marker>
      );
    case 'LineString':
      return (
        <Polyline
          positions={feature.geometry.coordinates.map(toLatLng)}
          pathOptions={pathOptions}
          eventHandlers={handlers}
        >
          <Tooltip sticky>{feature.name}</Tooltip>
        </Polyline>
      );
    case 'Polygon':
      return (
        <Polygon
          positions={feature.geometry.coordinates.map((ring) => ring.map(toLatLng))}
          pathOptions={pathOptions}
          eventHandlers={handlers}
        >
          <Tooltip sticky>{feature.name}</Tooltip>
        </Polygon>
      );
  }
}

/** Shows the shape as it is being drawn, in the layer's own colour. */
function DrawingPreview({ drawing }: { drawing: DrawingState }) {
  const positions = drawing.positions.map(toLatLng);
  const options = { color: drawing.layer.color, weight: 4, dashArray: '4 6' };

  return (
    <>
      {positions.map((position, index) => (
        <Marker
          /* A click has no id of its own; its coordinates plus order identify it. */
          key={`${String(position[0])}-${String(position[1])}-${String(index)}`}
          position={position}
          icon={markerIcon(drawing.layer.color, true)}
          interactive={false}
        />
      ))}
      {drawing.kind === 'LineString' && positions.length > 1 && (
        <Polyline positions={positions} pathOptions={options} interactive={false} />
      )}
      {drawing.kind === 'Polygon' && positions.length > 2 && (
        <Polygon
          positions={positions}
          pathOptions={{ ...options, fillOpacity: 0.15 }}
          interactive={false}
        />
      )}
    </>
  );
}

function DrawClickHandler({ onDrawPosition }: { onDrawPosition: (position: Position) => void }) {
  useMapEvents({
    click: (event) => {
      onDrawPosition([event.latlng.lng, event.latlng.lat]);
    },
  });
  return null;
}

/** Adds a class while drawing so the cursor becomes a crosshair. */
function DrawingCursor({ active }: { active: boolean }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    container.classList.toggle('ecomap-drawing', active);
    return () => {
      container.classList.remove('ecomap-drawing');
    };
  }, [map, active]);

  return null;
}

/**
 * Moves the map when the requested view changes - for instance when a shared
 * link arrives with a feature id, or the admin previews a new start position.
 */
function ViewSynchroniser({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
    /* Only react to a deliberate change of target, not to the user panning. */
  }, [map, center[0], center[1], zoom]);

  return null;
}

/** Centre of a feature, in Leaflet's order - used to fly to a selected feature. */
export function featureCenter(feature: Feature): [number, number] {
  return toLatLng(geometryAnchor(feature.geometry));
}
