<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { apiAssetUrl } from '../api/client.js';

/**
 * A person's profile picture, cropped to a circle - or their initials when they
 * have none, or the picture fails to load.
 *
 * The picture is decorative next to a visible name, so it is hidden from screen
 * readers unless `label` asks for it to be announced.
 */
const props = withDefaults(
  defineProps<{
    name: string;
    /** Server-relative `avatarUrl`, or null for initials. */
    src: string | null;
    size?: number;
    label?: string;
  }>(),
  { size: 40 },
);

const failed = ref(false);
watch(
  () => props.src,
  () => {
    failed.value = false;
  },
);

const initials = computed(() => {
  const words = props.name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '?';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
});

const imageUrl = computed(() => (props.src && !failed.value ? apiAssetUrl(props.src) : null));
</script>

<template>
  <v-avatar
    :size="props.size"
    color="secondary"
    :role="props.label ? 'img' : undefined"
    :aria-label="props.label"
    :aria-hidden="props.label ? undefined : 'true'"
  >
    <img
      v-if="imageUrl"
      :src="imageUrl"
      alt=""
      class="user-avatar__image"
      loading="lazy"
      decoding="async"
      @error="failed = true"
    />
    <span v-else :style="{ fontSize: `${String(Math.round(props.size * 0.4))}px` }">
      {{ initials }}
    </span>
  </v-avatar>
</template>

<style scoped>
.user-avatar__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
