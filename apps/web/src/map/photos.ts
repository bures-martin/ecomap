import { featuresApi } from '../api/endpoints.js';

/**
 * Photo edits collected by the contribution form, applied once the
 * contribution itself is saved - a new contribution has no id to attach
 * photos to until then.
 */

export interface NewPhoto {
  /** Local identity for the list; never sent anywhere. */
  key: string;
  blob: Blob;
  /** Object URL for the preview; revoked when the photo is dropped or saved. */
  previewUrl: string;
  alt: string;
}

export interface PhotoChanges {
  added: NewPhoto[];
  removedIds: string[];
  /** New descriptions for photos that are already stored, by photo id. */
  altChanges: Record<string, string>;
}

export function emptyPhotoChanges(): PhotoChanges {
  return { added: [], removedIds: [], altChanges: {} };
}

export function hasPhotoChanges(changes: PhotoChanges): boolean {
  return (
    changes.added.length > 0 ||
    changes.removedIds.length > 0 ||
    Object.keys(changes.altChanges).length > 0
  );
}

export function releasePhotoPreviews(changes: PhotoChanges): void {
  for (const photo of changes.added) URL.revokeObjectURL(photo.previewUrl);
}

/**
 * Removes first (to free slots under the limit), then renames, then uploads,
 * one at a time. Carries on past a failure, so one bad photo does not cost
 * the rest; the count of failures is reported back.
 */
export async function syncPhotos(
  featureId: string,
  changes: PhotoChanges,
): Promise<{ failed: number }> {
  let failed = 0;
  const attempt = async (action: () => Promise<unknown>): Promise<void> => {
    try {
      await action();
    } catch {
      failed += 1;
    }
  };

  for (const imageId of changes.removedIds) {
    await attempt(() => featuresApi.removeImage(featureId, imageId));
  }
  for (const [imageId, alt] of Object.entries(changes.altChanges)) {
    if (changes.removedIds.includes(imageId)) continue;
    await attempt(() => featuresApi.updateImage(featureId, imageId, alt));
  }
  for (const photo of changes.added) {
    await attempt(() => featuresApi.addImage(featureId, photo.blob, photo.alt));
  }
  return { failed };
}
