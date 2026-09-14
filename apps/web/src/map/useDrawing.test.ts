import { createLayerInputSchema, layerSchema, type Layer, type Position } from '@ecomap/shared';
import { act, renderHook } from '@testing-library/react';
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

describe('useDrawing', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => useDrawing());
    expect(result.current.isDrawing).toBe(false);
    expect(result.current.toGeometry()).toBeNull();
  });

  it('collects positions while drawing a line', () => {
    const { result } = renderHook(() => useDrawing());

    act(() => {
      result.current.start(layer, 'LineString');
    });
    expect(result.current.isDrawing).toBe(true);
    expect(result.current.canFinish).toBe(false);

    act(() => {
      result.current.addPosition(A);
    });
    expect(result.current.canFinish).toBe(false);

    act(() => {
      result.current.addPosition(B);
    });
    expect(result.current.canFinish).toBe(true);
    expect(result.current.toGeometry()).toEqual({ type: 'LineString', coordinates: [A, B] });
  });

  it('moves the pin instead of collecting, when drawing a point', () => {
    const { result } = renderHook(() => useDrawing());

    act(() => {
      result.current.start(layer, 'Point');
    });
    act(() => {
      result.current.addPosition(A);
    });
    act(() => {
      result.current.addPosition(B);
    });

    expect(result.current.drawing?.positions).toEqual([B]);
    expect(result.current.toGeometry()).toEqual({ type: 'Point', coordinates: B });
  });

  it('undoes the last position', () => {
    const { result } = renderHook(() => useDrawing());

    act(() => {
      result.current.start(layer, 'Polygon');
    });
    act(() => {
      result.current.addPosition(A);
      result.current.addPosition(B);
    });
    act(() => {
      result.current.undo();
    });

    expect(result.current.drawing?.positions).toEqual([A]);
  });

  it('keeps the layer and shape when starting over', () => {
    const { result } = renderHook(() => useDrawing());

    act(() => {
      result.current.start(layer, 'Polygon');
    });
    act(() => {
      result.current.addPosition(A);
    });
    act(() => {
      result.current.reset();
    });

    expect(result.current.isDrawing).toBe(true);
    expect(result.current.drawing?.kind).toBe('Polygon');
    expect(result.current.drawing?.positions).toEqual([]);
  });

  it('returns to idle when cancelled', () => {
    const { result } = renderHook(() => useDrawing());

    act(() => {
      result.current.start(layer, 'Point');
    });
    act(() => {
      result.current.cancel();
    });

    expect(result.current.isDrawing).toBe(false);
    expect(result.current.drawing).toBeNull();
  });

  it('ignores positions added while idle', () => {
    const { result } = renderHook(() => useDrawing());
    act(() => {
      result.current.addPosition(A);
    });
    expect(result.current.drawing).toBeNull();
  });
});
