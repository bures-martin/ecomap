<script setup lang="ts">
import type { FeatureImage } from '@ecomap/shared';
import { onBeforeUnmount, ref, watch } from 'vue';
import { apiAssetUrl, apiBlob } from '../api/client.js';

/**
 * One contribution photo.
 *
 * A published contribution's photos are public, so the browser loads them
 * directly (lazily, and from its cache). Photos of a contribution that is not
 * public yet need the access token, which an `<img src>` cannot send, so they
 * are fetched and shown from an object URL instead.
 */
const props = defineProps<{
  image: FeatureImage;
  isPublic: boolean;
  /** Falls back to the contribution's name when the photo has no description. */
  fallbackAlt: string;
  fit?: 'cover' | 'contain';
}>();

const src = ref<string | null>(null);
const failed = ref(false);
let objectUrl: string | null = null;
/** Bumped for every load, so a slow answer for an earlier photo is ignored. */
let loadId = 0;

const release = (): void => {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = null;
};

async function load(url: string, isPublic: boolean): Promise<void> {
  loadId += 1;
  const id = loadId;
  failed.value = false;
  release();

  if (isPublic) {
    src.value = apiAssetUrl(url);
    return;
  }
  src.value = null;
  try {
    const blob = await apiBlob(url);
    if (id !== loadId) return;
    objectUrl = URL.createObjectURL(blob);
    src.value = objectUrl;
  } catch {
    if (id === loadId) failed.value = true;
  }
}

watch(
  () => [props.image.url, props.isPublic] as const,
  ([url, isPublic]) => {
    void load(url, isPublic);
  },
  { immediate: true },
);

onBeforeUnmount(release);
</script>

<template>
  <img
    v-if="src && !failed"
    :src="src"
    :alt="props.image.alt || props.fallbackAlt"
    class="feature-image"
    :class="`feature-image--${props.fit ?? 'cover'}`"
    loading="lazy"
    decoding="async"
    @error="failed = true"
  />
  <div v-else class="feature-image feature-image--placeholder" aria-hidden="true" />
</template>

<style scoped>
.feature-image {
  display: block;
  width: 100%;
  height: 100%;
}

.feature-image--cover {
  object-fit: cover;
}

.feature-image--contain {
  object-fit: contain;
}

.feature-image--placeholder {
  background: rgba(var(--v-theme-on-surface), 0.08);
}
</style>
