/**
 * Turning a photo from the device into a small upload, in the browser.
 *
 * Decoding through `createImageBitmap` applies the EXIF orientation, so phone
 * photos come out upright; drawing onto a canvas and re-encoding drops every
 * bit of EXIF metadata - the camera, and above all the GPS position of where
 * the photo was taken, which nobody should publish by accident.
 */

/** Refuse to even decode anything bigger; a phone photo is a few MB. */
export const MAX_SOURCE_BYTES = 30 * 1024 * 1024;

export type ImagePreparationReason = 'not-image' | 'too-large' | 'unreadable';

export class ImagePreparationError extends Error {
  readonly reason: ImagePreparationReason;

  constructor(reason: ImagePreparationReason) {
    super(reason);
    this.name = 'ImagePreparationError';
    this.reason = reason;
  }
}

/** Scales a size down to fit within `max` on its longer side; never scales up. */
export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

/**
 * WebP where the browser can encode it; Safari silently hands back a PNG
 * instead, which is far bigger, so it gets a JPEG. A busy picture that is
 * still over the limit is retried at lower qualities.
 */
export async function encodeCanvas(canvas: HTMLCanvasElement, maxBytes: number): Promise<Blob> {
  const attempts: [string, number][] = [
    ['image/webp', 0.85],
    ['image/jpeg', 0.88],
    ['image/jpeg', 0.75],
    ['image/jpeg', 0.6],
  ];
  for (const [type, quality] of attempts) {
    const blob = await toBlob(canvas, type, quality);
    if (blob?.type === type && blob.size <= maxBytes) return blob;
  }
  throw new ImagePreparationError('too-large');
}

/** Checks the file, then decodes it. The caller closes the bitmap when done. */
export async function decodeImageFile(file: File): Promise<ImageBitmap> {
  if (!file.type.startsWith('image/')) throw new ImagePreparationError('not-image');
  if (file.size > MAX_SOURCE_BYTES) throw new ImagePreparationError('too-large');
  try {
    return await createImageBitmap(file);
  } catch {
    throw new ImagePreparationError('unreadable');
  }
}

/** Shrinks a photo to `maxDimension` and re-encodes it under `maxBytes`. */
export async function prepareImage(
  file: File,
  options: { maxDimension: number; maxBytes: number },
): Promise<Blob> {
  const bitmap = await decodeImageFile(file);
  try {
    const size = fitWithin(bitmap.width, bitmap.height, options.maxDimension);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) throw new ImagePreparationError('unreadable');

    /* No transparency in a JPEG: give a see-through PNG a white backing. */
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size.width, size.height);
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    return await encodeCanvas(canvas, options.maxBytes);
  } finally {
    bitmap.close();
  }
}
