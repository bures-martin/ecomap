import {
  closeRing,
  type Geometry,
  type GeometryKind,
  type Layer,
  type Position,
} from '@ecomap/shared';
import { useCallback, useMemo, useState } from 'react';

/**
 * The drawing interaction, as a small state machine.
 *
 * `idle` -> `drawing` (the user picked a layer and a shape) -> `ready` (enough
 * points to make a valid geometry) -> back to `idle` once the form is submitted
 * or cancelled. Keeping it here means the map components stay presentational and
 * the rules are unit-testable without a DOM.
 */

export interface DrawingState {
  layer: Layer;
  kind: GeometryKind;
  positions: Position[];
}

/** The minimum number of clicks each shape needs before it can be finished. */
export const MINIMUM_POSITIONS: Readonly<Record<GeometryKind, number>> = {
  Point: 1,
  LineString: 2,
  Polygon: 3,
};

export interface UseDrawingResult {
  drawing: DrawingState | null;
  isDrawing: boolean;
  /** True once enough points have been placed to build a valid geometry. */
  canFinish: boolean;
  start: (layer: Layer, kind: GeometryKind) => void;
  addPosition: (position: Position) => void;
  undo: () => void;
  reset: () => void;
  cancel: () => void;
  /** The geometry built from the current positions, or null if not ready. */
  toGeometry: () => Geometry | null;
}

export function useDrawing(): UseDrawingResult {
  const [drawing, setDrawing] = useState<DrawingState | null>(null);

  const start = useCallback((layer: Layer, kind: GeometryKind) => {
    setDrawing({ layer, kind, positions: [] });
  }, []);

  const addPosition = useCallback((position: Position) => {
    setDrawing((current) => {
      if (!current) return current;
      /* A point has exactly one position: a second click moves the pin. */
      if (current.kind === 'Point') {
        return { ...current, positions: [position] };
      }
      return { ...current, positions: [...current.positions, position] };
    });
  }, []);

  const undo = useCallback(() => {
    setDrawing((current) =>
      current ? { ...current, positions: current.positions.slice(0, -1) } : current,
    );
  }, []);

  const reset = useCallback(() => {
    setDrawing((current) => (current ? { ...current, positions: [] } : current));
  }, []);

  const cancel = useCallback(() => {
    setDrawing(null);
  }, []);

  const canFinish = useMemo(
    () => (drawing ? drawing.positions.length >= MINIMUM_POSITIONS[drawing.kind] : false),
    [drawing],
  );

  const toGeometry = useCallback((): Geometry | null => {
    if (!drawing || drawing.positions.length < MINIMUM_POSITIONS[drawing.kind]) return null;
    return buildGeometry(drawing.kind, drawing.positions);
  }, [drawing]);

  return {
    drawing,
    isDrawing: drawing !== null,
    canFinish,
    start,
    addPosition,
    undo,
    reset,
    cancel,
    toGeometry,
  };
}

/** Turns a click sequence into GeoJSON, closing a polygon ring on the way. */
export function buildGeometry(kind: GeometryKind, positions: readonly Position[]): Geometry | null {
  if (positions.length < MINIMUM_POSITIONS[kind]) return null;

  switch (kind) {
    case 'Point': {
      const [first] = positions;
      return first ? { type: 'Point', coordinates: first } : null;
    }
    case 'LineString':
      return { type: 'LineString', coordinates: [...positions] };
    case 'Polygon':
      return { type: 'Polygon', coordinates: [closeRing(positions)] };
  }
}
