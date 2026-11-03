/**
 * Geometry of the profile-picture editor, kept free of the DOM so it can be
 * unit-tested.
 *
 * The editor shows a square viewport with a circle inscribed in it. The photo
 * sits behind it: `offsetX`/`offsetY` move the photo's centre away from the
 * viewport's centre (in viewport pixels), `zoom` scales it, and `rotation`
 * turns it in quarter turns. The one invariant: the photo always covers the
 * whole viewport, so the circle - and the square saved around it - never shows
 * an empty corner.
 */

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

export type Rotation = 0 | 90 | 180 | 270;

export interface CropState {
  zoom: number;
  offsetX: number;
  offsetY: number;
  rotation: Rotation;
}

export interface ImageSize {
  width: number;
  height: number;
}

export const INITIAL_CROP: CropState = { zoom: 1, offsetX: 0, offsetY: 0, rotation: 0 };

/** The photo's size as seen on screen, once rotated. */
export function rotatedSize(image: ImageSize, rotation: Rotation): ImageSize {
  return rotation === 90 || rotation === 270 ? { width: image.height, height: image.width } : image;
}

/** The pixel scale at which the photo exactly covers the viewport at zoom 1. */
export function coverScale(image: ImageSize, rotation: Rotation, viewport: number): number {
  const { width, height } = rotatedSize(image, rotation);
  return viewport / Math.min(width, height);
}

/** The scale actually applied to the photo's pixels. */
export function displayScale(image: ImageSize, state: CropState, viewport: number): number {
  return coverScale(image, state.rotation, viewport) * state.zoom;
}

const clamp = (value: number, limit: number): number => Math.min(limit, Math.max(-limit, value));

/** Pulls the offsets back so no edge of the photo moves inside the viewport. */
export function clampCrop(image: ImageSize, state: CropState, viewport: number): CropState {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, state.zoom));
  const scale = coverScale(image, state.rotation, viewport) * zoom;
  const { width, height } = rotatedSize(image, state.rotation);
  const slackX = Math.max(0, (width * scale - viewport) / 2);
  const slackY = Math.max(0, (height * scale - viewport) / 2);
  return {
    ...state,
    zoom,
    offsetX: clamp(state.offsetX, slackX),
    offsetY: clamp(state.offsetY, slackY),
  };
}

export function panBy(
  image: ImageSize,
  state: CropState,
  viewport: number,
  dx: number,
  dy: number,
): CropState {
  return clampCrop(
    image,
    { ...state, offsetX: state.offsetX + dx, offsetY: state.offsetY + dy },
    viewport,
  );
}

/** Zooms around the viewport's centre, so the face in the circle stays put. */
export function zoomTo(
  image: ImageSize,
  state: CropState,
  viewport: number,
  zoom: number,
): CropState {
  const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
  const ratio = next / state.zoom;
  return clampCrop(
    image,
    { ...state, zoom: next, offsetX: state.offsetX * ratio, offsetY: state.offsetY * ratio },
    viewport,
  );
}

/** A quarter turn clockwise, turning the offset with the photo. */
export function rotateClockwise(image: ImageSize, state: CropState, viewport: number): CropState {
  const rotation = ((state.rotation + 90) % 360) as Rotation;
  return clampCrop(
    image,
    /* `0 - y` rather than `-y`, which would turn an offset of 0 into -0. */
    { ...state, rotation, offsetX: 0 - state.offsetY, offsetY: state.offsetX },
    viewport,
  );
}

/** Draws the photo as it sits in the viewport onto a square canvas of any size. */
export function drawCrop(
  context: CanvasRenderingContext2D,
  image: ImageBitmap,
  state: CropState,
  viewport: number,
  outputSize: number,
): void {
  const ratio = outputSize / viewport;
  const scale = displayScale(image, state, viewport) * ratio;

  context.save();
  context.imageSmoothingQuality = 'high';
  context.translate(outputSize / 2 + state.offsetX * ratio, outputSize / 2 + state.offsetY * ratio);
  context.rotate((state.rotation * Math.PI) / 180);
  context.scale(scale, scale);
  context.drawImage(image, -image.width / 2, -image.height / 2);
  context.restore();
}
