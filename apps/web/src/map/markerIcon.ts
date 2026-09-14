import L from 'leaflet';

/**
 * Markers are built as Leaflet `divIcon`s from inline SVG rather than from image
 * files.
 *
 * That gives each layer its own colour without shipping one PNG per layer, and
 * it sidesteps the well-known bundler problem where Leaflet's default icon URLs
 * resolve to nothing after a build.
 */

const MARKER_WIDTH = 26;
const MARKER_HEIGHT = 36;

const iconCache = new Map<string, L.DivIcon>();

export function markerIcon(color: string, selected = false): L.DivIcon {
  const key = `${color}:${String(selected)}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const stroke = selected ? '#ffffff' : 'rgba(0,0,0,0.35)';
  const strokeWidth = selected ? 3 : 1.5;

  const icon = L.divIcon({
    className: 'ecomap-marker',
    html: `
      <svg width="${MARKER_WIDTH}" height="${MARKER_HEIGHT}" viewBox="0 0 26 36"
           xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">
        <path d="M13 35C13 35 24 21.7 24 13A11 11 0 1 0 2 13c0 8.7 11 22 11 22z"
              fill="${escapeAttribute(color)}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <circle cx="13" cy="13" r="4.5" fill="#ffffff" fill-opacity="0.92"/>
      </svg>
    `,
    iconSize: [MARKER_WIDTH, MARKER_HEIGHT],
    /* The tip of the pin is the anchor, not its centre. */
    iconAnchor: [MARKER_WIDTH / 2, MARKER_HEIGHT],
    popupAnchor: [0, -MARKER_HEIGHT + 6],
  });

  iconCache.set(key, icon);
  return icon;
}

/** Colours come from the database, so they are escaped before entering markup. */
function escapeAttribute(value: string): string {
  return value.replace(/[<>"'&]/g, '');
}
