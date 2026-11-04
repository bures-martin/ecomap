import { mdiCrosshairsGps } from '@mdi/js';
import L from 'leaflet';

/** Close enough to see the street, not so close that the accuracy circle fills the screen. */
const LOCATE_ZOOM = 16;
const DOT_COLOR = '#1a73e8';

export type LocateFailure = 'denied' | 'unavailable';

export interface LocateControl {
  setLabel: (label: string) => void;
  remove: () => void;
}

/**
 * A "show my location" button under the zoom buttons. A tap asks the browser
 * once for the position (no tracking), centres the map on it and draws a blue
 * dot with a circle for how accurate the fix is. Nothing is sent anywhere.
 */
export function addLocateControl(
  map: L.Map,
  label: string,
  onFailure: (failure: LocateFailure) => void,
): LocateControl {
  const marker = L.layerGroup().addTo(map);
  let button: HTMLAnchorElement | null = null;

  const Control = L.Control.extend({
    onAdd() {
      const bar = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      button = L.DomUtil.create('a', 'ecomap-locate', bar);
      button.href = '#';
      button.role = 'button';
      button.title = label;
      button.setAttribute('aria-label', label);
      button.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="${mdiCrosshairsGps}" fill="currentColor"/></svg>`;
      L.DomEvent.disableClickPropagation(bar);
      L.DomEvent.on(button, 'click', (event) => {
        L.DomEvent.preventDefault(event);
        if (!('geolocation' in navigator)) {
          onFailure('unavailable');
          return;
        }
        button?.classList.add('ecomap-locate--busy');
        map.locate({ setView: true, maxZoom: LOCATE_ZOOM, enableHighAccuracy: true });
      });
      return bar;
    },
  });
  const control = new Control({ position: 'topleft' }).addTo(map);

  const onFound = (event: L.LocationEvent): void => {
    button?.classList.remove('ecomap-locate--busy');
    marker.clearLayers();
    L.circle(event.latlng, {
      radius: event.accuracy,
      color: DOT_COLOR,
      weight: 1,
      fillOpacity: 0.12,
      interactive: false,
    }).addTo(marker);
    L.circleMarker(event.latlng, {
      radius: 7,
      color: '#ffffff',
      weight: 2,
      fillColor: DOT_COLOR,
      fillOpacity: 1,
      interactive: false,
    }).addTo(marker);
  };
  const onError = (event: L.ErrorEvent): void => {
    button?.classList.remove('ecomap-locate--busy');
    /* GeolocationPositionError.PERMISSION_DENIED */
    onFailure(event.code === 1 ? 'denied' : 'unavailable');
  };
  map.on('locationfound', onFound);
  map.on('locationerror', onError);

  return {
    setLabel(next) {
      if (!button) return;
      button.title = next;
      button.setAttribute('aria-label', next);
    },
    remove() {
      map.off('locationfound', onFound);
      map.off('locationerror', onError);
      map.stopLocate();
      control.remove();
      marker.remove();
    },
  };
}
