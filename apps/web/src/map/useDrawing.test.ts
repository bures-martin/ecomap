import { createLayerInputSchema, layerSchema, type Layer, type Position } from '@ecomap/shared';
import { describe, expect, it } from 'vitest';
import { buildGeometry, useDrawing } from './useDrawing.js';

const layer: Layer = layerSchema.parse({
  ...createLayerInputSchema.parse({ slug: 'test-layer', name: 'Test layer' }),
  id: '11111111-2222-4333-8444-555555555555',
  featureCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const A: Position = [14.9, 55.1];
const B: Position = [15.0, 55.2];
const C: Position = [15.1, 55.0];

describe('buildGeometry', () => {
  it('builds a point from one position', () => {
    expect(buildGeometry('Point', [A])).toEqual({ type: 'Point', coordinates: A });
  });

  it('refuses a line with a single position', () => {
    expect(buildGeometry('LineString', [A])).toBeNull();
  });

  it('builds a line from two positions', () => {
    expect(buildGeometry('LineString', [A, B])).toEqual({
      type: 'LineString',
      coordinates: [A, B],
    });
  });

  it('closes the ring when building a polygon', () => {
    const geometry = buildGeometry('Polygon', [A, B, C]);
    expect(geometry).toEqual({ type: 'Polygon', coordinates: [[A, B, C, A]] });
  });

  it('refuses a polygon with only two corners', () => {
    expect(buildGeometry('Polygon', [A, B])).toBeNull();
  });
});

/* A composable outside a component is just functions over refs - no harness needed. */
describe('useDrawing', () => {
  it('starts idle', () => {
    const drawing = useDrawing();
    expect(drawing.isDrawing.value).toBe(false);
    expect(drawing.toGeometry()).toBeNull();
  });

  it('collects positions while drawing a line', () => {
    const drawing = useDrawing();

    drawing.start(layer, 'LineString');
    expect(drawing.isDrawing.value).toBe(true);
    expect(drawing.canFinish.value).toBe(false);

    drawing.addPosition(A);
    expect(drawing.canFinish.value).toBe(false);

    drawing.addPosition(B);
    expect(drawing.canFinish.value).toBe(true);
    expect(drawing.toGeometry()).toEqual({ type: 'LineString', coordinates: [A, B] });
  });

  it('moves the pin instead of collecting, when drawing a point', () => {
    const drawing = useDrawing();

    drawing.start(layer, 'Point');
    drawing.addPosition(A);
    drawing.addPosition(B);

    expect(drawing.drawing.value?.positions).toEqual([B]);
    expect(drawing.toGeometry()).toEqual({ type: 'Point', coordinates: B });
  });

  it('undoes the last position', () => {
    const drawing = useDrawing();

    drawing.start(layer, 'Polygon');
    drawing.addPosition(A);
    drawing.addPosition(B);
    drawing.undo();

    expect(drawing.drawing.value?.positions).toEqual([A]);
  });

  it('keeps the layer and shape when starting over', () => {
    const drawing = useDrawing();

    drawing.start(layer, 'Polygon');
    drawing.addPosition(A);
    drawing.reset();

    expect(drawing.isDrawing.value).toBe(true);
    expect(drawing.drawing.value?.kind).toBe('Polygon');
    expect(drawing.drawing.value?.positions).toEqual([]);
  });

  it('returns to idle when cancelled', () => {
    const drawing = useDrawing();

    drawing.start(layer, 'Point');
    drawing.cancel();

    expect(drawing.isDrawing.value).toBe(false);
    expect(drawing.drawing.value).toBeNull();
  });

  it('ignores positions added while idle', () => {
    const drawing = useDrawing();
    drawing.addPosition(A);
    expect(drawing.drawing.value).toBeNull();
  });

  it('replaces the state on every change, so watchers fire', () => {
    const drawing = useDrawing();
    drawing.start(layer, 'LineString');
    const before = drawing.drawing.value;
    drawing.addPosition(A);
    expect(drawing.drawing.value).not.toBe(before);
  });
});
