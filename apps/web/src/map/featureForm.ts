import type { PropertyBag } from '@ecomap/shared';
import type { PhotoChanges } from './photos.js';

export interface FeatureFormValues {
  name: string;
  description: string;
  properties: PropertyBag;
  isDraft: boolean;
  /** Applied after the contribution itself is saved; see `syncPhotos`. */
  photos: PhotoChanges;
}
