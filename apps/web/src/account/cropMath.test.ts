import { describe, expect, it } from 'vitest';
import {
  INITIAL_CROP,
  MAX_ZOOM,
  clampCrop,
  coverScale,
  panBy,
  rotateClockwise,
  zoomTo,
  type CropState,
} from './cropMath.js';

const VIEWPORT = 300;
/* A landscape photo: 600 x 300 covers the viewport at scale 1, with 150px to spare each side. */
const landscape = { width: 600, height: 300 };

describe('coverScale', () => {
  it('fits the shorter side to the viewport', () => {
    expect(coverScale(landscape, 0, VIEWPORT)).toBe(1);
    expect(coverScale({ width: 3000, height: 4000 }, 0, VIEWPORT)).toBe(0.1);
  });

  it('accounts for a quarter turn', () => {
    expect(coverScale({ width: 600, height: 1200 }, 90, VIEWPORT)).toBe(0.5);
  });
});

describe('panBy', () => {
  it('moves the photo freely within its spare width', () => {
    expect(panBy(landscape, INITIAL_CROP, VIEWPORT, 100, 0).offsetX).toBe(100);
  });

  it('stops at the edge, so the circle never shows an empty corner', () => {
    expect(panBy(landscape, INITIAL_CROP, VIEWPORT, 1000, 0).offsetX).toBe(150);
    expect(panBy(landscape, INITIAL_CROP, VIEWPORT, -1000, 0).offsetX).toBe(-150);
  });

  it('cannot move along the side that exactly fits', () => {
    expect(panBy(landscape, INITIAL_CROP, VIEWPORT, 0, 50).offsetY).toBe(0);
  });
});

describe('zoomTo', () => {
  it('keeps the point under the centre of the circle in place', () => {
    const panned: CropState = { ...INITIAL_CROP, offsetX: 100 };
    expect(zoomTo(landscape, panned, VIEWPORT, 2).offsetX).toBe(200);
  });

  it('stays between 1x and the maximum', () => {
    expect(zoomTo(landscape, INITIAL_CROP, VIEWPORT, 0.2).zoom).toBe(1);
    expect(zoomTo(landscape, INITIAL_CROP, VIEWPORT, 99).zoom).toBe(MAX_ZOOM);
  });

  it('pulls the photo back in when zooming out would expose an edge', () => {
    const zoomedAndPanned: CropState = { ...INITIAL_CROP, zoom: 2, offsetX: 450 };
    expect(zoomTo(landscape, zoomedAndPanned, VIEWPORT, 1).offsetX).toBe(150);
  });
});

describe('rotateClockwise', () => {
  it('cycles through the four quarter turns', () => {
    let state = INITIAL_CROP;
    const seen: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      state = rotateClockwise(landscape, state, VIEWPORT);
      seen.push(state.rotation);
    }
    expect(seen).toEqual([90, 180, 270, 0]);
  });

  it('re-applies the limits for the turned shape', () => {
    /* Panned fully right; once turned upright the photo has no spare width at all. */
    const panned = panBy(landscape, INITIAL_CROP, VIEWPORT, 150, 0);
    const turned = rotateClockwise(landscape, panned, VIEWPORT);
    expect(turned.offsetX).toBe(0);
    expect(turned.offsetY).toBe(150);
  });
});

describe('clampCrop', () => {
  it('leaves a valid state untouched', () => {
    const state: CropState = { zoom: 2, offsetX: 10, offsetY: -10, rotation: 0 };
    expect(clampCrop(landscape, state, VIEWPORT)).toEqual(state);
  });
});
