import { z } from 'zod';

/**
 * Uploaded images - profile pictures and contribution photos.
 *
 * The browser shrinks and re-encodes every image before upload, so the server
 * only stores these few formats, and never the original photo with its full
 * resolution and EXIF metadata (camera, and above all GPS location).
 */

export const IMAGE_CONTENT_TYPES = ['image/webp', 'image/jpeg', 'image/png'] as const;
export type ImageContentType = (typeof IMAGE_CONTENT_TYPES)[number];

export function isImageContentType(value: unknown): value is ImageContentType {
  return IMAGE_CONTENT_TYPES.some((type) => type === value);
}

/**
 * Identifies an image by its first bytes rather than by what the client claims,
 * so a script or HTML file sent with `Content-Type: image/png` is refused.
 */
export function sniffImageContentType(bytes: Uint8Array): ImageContentType | null {
  const startsWith = (signature: readonly number[], offset = 0): boolean =>
    bytes.length >= offset + signature.length &&
    signature.every((byte, index) => bytes[offset + index] === byte);

  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith([0xff, 0xd8, 0xff])) return 'image/jpeg';
  /* "RIFF" <4-byte size> "WEBP" */
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp';
  }
  return null;
}

/* ------------------------------------------------- contribution photos ---- */

export const FEATURE_IMAGE_MAX_COUNT = 6;
/** Longest side, in pixels, after the browser has shrunk the photo. */
export const FEATURE_IMAGE_MAX_DIMENSION = 1600;
/** A 1600px WebP is typically 150-400 KB; this leaves room for busy photos. */
export const FEATURE_IMAGE_MAX_BYTES = 1024 * 1024;

/** A short description for people who cannot see the photo. */
export const imageAltSchema = z.string().trim().max(300);

export const featureImageSchema = z.object({
  id: z.uuid(),
  /** Server-relative path to the image bytes. */
  url: z.string(),
  alt: z.string(),
});
export type FeatureImage = z.infer<typeof featureImageSchema>;

export const updateFeatureImageInputSchema = z.object({ alt: imageAltSchema });
export type UpdateFeatureImageInput = z.infer<typeof updateFeatureImageInputSchema>;

export const featureImageQuerySchema = z.object({ alt: imageAltSchema.default('') });

export function featureImagePath(featureId: string, imageId: string): string {
  return `/api/features/${featureId}/images/${imageId}`;
}
