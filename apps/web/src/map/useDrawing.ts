import {
  closeRing,
  type Geometry,
  type GeometryKind,
  type Layer,
  type Position,
} from '@ecomap/shared';
import { computed, shallowRef, type ComputedRef, type ShallowRef } from 'vue';

/**
 * The drawing interaction, as a small state machine.
 *
 * `idle` -> `drawing` (the user picked a layer and a shape) -> `ready` (enough
 * points to make a valid geometry) -> back to `idle` once the form is submitted
 * or cancelled. Keeping it here means the map components stay presentational and
 * the rules are unit-testable without a DOM.
 *
 * The state is replaced, never mutated, so a watcher on `drawing` sees every
 * change.
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
  drawing: Readonly<ShallowRef<DrawingState | null>>;
  isDrawing: ComputedRef<boolean>;
  /** True once enough points have been placed to build a valid geometry. */
  canFinish: ComputedRef<boolean>;
  start: (layer: Layer, kind: GeometryKind) => void;
  addPosition: (position: Position) => void;
  undo: () => void;
  reset: () => void;
  cancel: () => void;
  /** The geometry built from the current positions, or null if not ready. */
  toGeometry: () => Geometry | null;
}

export function useDrawing(): UseDrawingResult {
  const drawing = shallowRef<DrawingState | null>(null);

  const update = (change: (current: DrawingState) => DrawingState): void => {
    if (drawing.value) drawing.value = change(drawing.value);
  };

  return {
    drawing,
    isDrawing: computed(() => drawing.value !== null),
    canFinish: computed(() =>
      drawing.value
        ? drawing.value.positions.length >= MINIMUM_POSITIONS[drawing.value.kind]
        : false,
    ),
    start: (layer, kind) => {
      drawing.value = { layer, kind, positions: [] };
    },
    addPosition: (position) => {
      update((current) =>
        /* A point has exactly one position: a second click moves the pin. */
        current.kind === 'Point'
          ? { ...current, positions: [position] }
          : { ...current, positions: [...current.positions, position] },
      );
    },
    undo: () => {
      update((current) => ({ ...current, positions: current.positions.slice(0, -1) }));
    },
    reset: () => {
      update((current) => ({ ...current, positions: [] }));
    },
    cancel: () => {
      drawing.value = null;
    },
    toGeometry: () =>
      drawing.value ? buildGeometry(drawing.value.kind, drawing.value.positions) : null,
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
