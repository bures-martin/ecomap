import { BASEMAPS } from '@ecomap/shared';
import L from 'leaflet';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addBasemapSwitcher, basemapDefinition, isBasemap } from './basemaps.js';

describe('basemapDefinition', () => {
  it('has an https tile URL and a credit for every background map', () => {
    for (const basemap of BASEMAPS) {
      const definition = basemapDefinition(basemap);
      expect(definition.url).toMatch(/^https:\/\//);
      expect(definition.url).toContain('{z}');
      expect(definition.attribution.length).toBeGreaterThan(0);
    }
  });

  it('credits OpenStreetMap on every map drawn from its data', () => {
    for (const basemap of BASEMAPS.filter((name) => name !== 'satellite')) {
      expect(basemapDefinition(basemap).attribution).toContain('OpenStreetMap');
    }
  });

  it('credits Esri on the satellite map', () => {
    expect(basemapDefinition('satellite').attribution).toContain('Esri');
  });
});

describe('isBasemap', () => {
  it('accepts known maps only', () => {
    expect(isBasemap('streets')).toBe(true);
    expect(isBasemap('mapy-outdoor')).toBe(false);
    expect(isBasemap(null)).toBe(false);
  });
});

describe('addBasemapSwitcher', () => {
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    container?.remove();
    container = null;
  });

  function makeMap(): L.Map {
    container = document.createElement('div');
    document.body.append(container);
    return L.map(container, { center: [55.1, 14.9], zoom: 10 });
  }

  const tileUrls = (map: L.Map): string[] => {
    const urls: string[] = [];
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) urls.push((layer as unknown as { _url: string })._url);
    });
    return urls;
  };

  const baseLabels = (): HTMLLabelElement[] => [
    ...(container?.querySelectorAll<HTMLLabelElement>('.leaflet-control-layers-base label') ?? []),
  ];

  it('shows the initial map, offers all of them, and swaps on show()', () => {
    const map = makeMap();
    const switcher = addBasemapSwitcher(map, 'streets', (basemap) => `label-${basemap}`);

    expect(tileUrls(map)).toEqual([basemapDefinition('streets').url]);
    expect(baseLabels().map((label) => label.textContent.trim())).toEqual(
      BASEMAPS.map((basemap) => `label-${basemap}`),
    );

    switcher.show('satellite');
    expect(tileUrls(map)).toEqual([basemapDefinition('satellite').url]);
  });

  it('reports a pick in the switcher, but not a programmatic show()', () => {
    const map = makeMap();
    const onPick = vi.fn();
    const switcher = addBasemapSwitcher(map, 'streets', (basemap) => basemap, onPick);

    switcher.show('dark');
    expect(onPick).not.toHaveBeenCalled();

    baseLabels()
      .find((label) => label.textContent.trim() === 'topo')
      ?.querySelector('input')
      ?.click();
    expect(onPick).toHaveBeenCalledWith('topo');
    expect(tileUrls(map)).toEqual([basemapDefinition('topo').url]);
  });
});
