import L from 'leaflet';
import { layerIconPath } from './layerIcons.js';

/**
 * Markers are built as Leaflet `divIcon`s from inline SVG rather than from image
 * files.
 *
 * That gives each layer its own colour and icon without shipping one PNG per
 * layer, and it sidesteps the well-known bundler problem where Leaflet's
 * default icon URLs resolve to nothing after a build.
 */

const MARKER_WIDTH = 30;
const MARKER_HEIGHT = 40;
/** The layer icon inside the pin's head, in pixels. */
const GLYPH = 15;

const iconCache = new Map<string, L.DivIcon>();

export function markerIcon(color: string, icon: string, selected = false): L.DivIcon {
  const key = `${color}:${icon}:${String(selected)}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const stroke = selected ? '#ffffff' : 'rgba(0,0,0,0.35)';
  const strokeWidth = selected ? 3 : 1.5;
  /* Centre the 24x24 icon in the pin's round head (centre 15,15). */
  const offset = 15 - GLYPH / 2;
  const scale = GLYPH / 24;

  const divIcon = L.divIcon({
    className: `ecomap-marker${selected ? ' ecomap-marker--selected' : ''}`,
    html: `
      <svg width="${MARKER_WIDTH}" height="${MARKER_HEIGHT}" viewBox="0 0 30 40"
           xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">
        <path d="M15 39C15 39 28 24.3 28 15A13 13 0 1 0 2 15c0 9.3 13 24 13 24z"
              fill="${escapeAttribute(color)}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <path d="${layerIconPath(icon)}" fill="#ffffff"
              transform="translate(${String(offset)} ${String(offset)}) scale(${String(scale)})"/>
      </svg>
    `,
    iconSize: [MARKER_WIDTH, MARKER_HEIGHT],
    /* The tip of the pin is the anchor, not its centre. */
    iconAnchor: [MARKER_WIDTH / 2, MARKER_HEIGHT],
    popupAnchor: [0, -MARKER_HEIGHT + 6],
  });

  iconCache.set(key, divIcon);
  return divIcon;
}

/**
 * A group of nearby places, drawn when the map is zoomed out: a round badge
 * with the count, a little larger the more it holds.
 */
export function clusterIcon(count: number): L.DivIcon {
  const size = count < 10 ? 34 : count < 50 ? 40 : 48;
  return L.divIcon({
    className: 'ecomap-cluster',
    html: `<span style="width:${String(size)}px;height:${String(size)}px">${String(count)}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Colours come from the database, so they are escaped before entering markup. */
function escapeAttribute(value: string): string {
  return value.replace(/[<>"'&]/g, '');
}
