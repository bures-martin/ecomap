import type { PropertyBag } from '@ecomap/shared';

export interface FeatureFormValues {
  name: string;
  description: string;
  properties: PropertyBag;
  isDraft: boolean;
}
