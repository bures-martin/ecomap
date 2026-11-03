import { IMAGE_CONTENT_TYPES, type ImageContentType } from './images.js';

/**
 * Profile pictures. The browser crops and re-encodes every picture to a small
 * square before upload; see `images.ts` for the accepted formats and the
 * byte-level type check.
 */

/** Width and height, in pixels, of the stored square. */
export const AVATAR_SIZE = 512;

/** Upper bound for an upload. A 512px WebP or JPEG is typically 20-80 KB. */
export const AVATAR_MAX_BYTES = 256 * 1024;

export const AVATAR_CONTENT_TYPES = IMAGE_CONTENT_TYPES;
export type AvatarContentType = ImageContentType;

/** Path of a user's picture, versioned so a new upload is never served from cache. */
export function avatarPath(userId: string, updatedAt: string | Date): string {
  const version = new Date(updatedAt).getTime();
  return `/api/users/${userId}/avatar?v=${String(version)}`;
}
