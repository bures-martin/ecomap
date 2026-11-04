import { BORNHOLM } from './bornholm/index.js';
import { NEUTRAL } from './neutral/index.js';
import type { Community } from './types.js';

export type { Community, CommunityPlace } from './types.js';

/** Every community the seed can write into a database, by its COMMUNITY name. */
export const COMMUNITIES = {
  neutral: NEUTRAL,
  bornholm: BORNHOLM,
} as const satisfies Record<string, Community>;

export type CommunitySlug = keyof typeof COMMUNITIES;

export const COMMUNITY_SLUGS = Object.keys(COMMUNITIES) as [CommunitySlug, ...CommunitySlug[]];
