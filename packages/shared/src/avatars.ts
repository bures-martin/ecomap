/**
 * Profile pictures.
 *
 * The browser crops and re-encodes every picture to a small square before
 * upload, so the server only ever stores and serves these few formats, never
 * the original photo with its full resolution and EXIF metadata.
 */

/** Width and height, in pixels, of the stored square. */
export const AVATAR_SIZE = 512;

/** Upper bound for an upload. A 512px WebP or JPEG is typically 20-80 KB. */
export const AVATAR_MAX_BYTES = 256 * 1024;

export const AVATAR_CONTENT_TYPES = ['image/webp', 'image/jpeg', 'image/png'] as const;
export type AvatarContentType = (typeof AVATAR_CONTENT_TYPES)[number];

export function isAvatarContentType(value: unknown): value is AvatarContentType {
  return AVATAR_CONTENT_TYPES.some((type) => type === value);
}

/**
 * Identifies an image by its first bytes rather than by what the client claims,
 * so a script or HTML file sent with `Content-Type: image/png` is refused.
 */
export function sniffAvatarContentType(bytes: Uint8Array): AvatarContentType | null {
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

/** Path of a user's picture, versioned so a new upload is never served from cache. */
export function avatarPath(userId: string, updatedAt: string | Date): string {
  const version = new Date(updatedAt).getTime();
  return `/api/users/${userId}/avatar?v=${String(version)}`;
}
