<script setup lang="ts">
import { layerIconPath } from './layerIcons.js';

/**
 * A layer's icon in the layer's colour - the same picture as on the topic
 * chips, for lists and menus that name a layer.
 */
const props = withDefaults(defineProps<{ icon: string; color: string; size?: number }>(), {
  size: 20,
});
</script>

<template>
  <svg
    class="layer-icon"
    viewBox="0 0 24 24"
    :width="props.size"
    :height="props.size"
    :style="{ color: props.color }"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="layerIconPath(props.icon)" fill="currentColor" />
  </svg>
</template>

<style scoped>
.layer-icon {
  flex-shrink: 0;
}
</style>
