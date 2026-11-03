<script setup lang="ts">
import type { Layer } from '@ecomap/shared';
import { useTranslation } from 'i18next-vue';
import { computed } from 'vue';
import { isOnlyLayer, layersAfterChip, type MapFilters } from './filters.js';
import { layerIconPath } from './layerIcons.js';

/**
 * A row of topics over the map - the quick way in, like the "Restaurants ·
 * Hotels" row on a big map app. Tapping a topic shows only that layer; tapping
 * it again goes back to the starting view. The layer list in the side panel
 * stays for combining several.
 */
const props = defineProps<{ layers: readonly Layer[]; filters: MapFilters }>();
const emit = defineEmits<{ 'update:filters': [filters: MapFilters] }>();

const { t } = useTranslation();

const topics = computed(() => props.layers.filter((layer) => layer.isPublished));

const pick = (slug: string): void => {
  emit('update:filters', { ...props.filters, layers: layersAfterChip(props.filters, slug) });
};
</script>

<template>
  <nav class="topic-chips" :aria-label="t('map.topics')">
    <button
      v-for="layer in topics"
      :key="layer.id"
      type="button"
      class="topic-chip"
      :class="{ 'topic-chip--active': isOnlyLayer(props.filters, layer.slug) }"
      :style="{ '--topic-color': layer.color }"
      :aria-pressed="isOnlyLayer(props.filters, layer.slug)"
      @click="pick(layer.slug)"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path :d="layerIconPath(layer.icon)" fill="currentColor" />
      </svg>
      <span>{{ layer.name }}</span>
    </button>
  </nav>
</template>

<style scoped>
.topic-chips {
  position: absolute;
  top: 10px;
  /* Clear of Leaflet's zoom buttons on the left. */
  left: 56px;
  right: 10px;
  z-index: 1000;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px 2px 6px;
  scrollbar-width: none;
}

.topic-chips::-webkit-scrollbar {
  display: none;
}

.topic-chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px 0 10px;
  border-radius: 17px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-header));
  color: rgb(var(--v-theme-on-header));
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
}

.topic-chip svg {
  color: var(--topic-color);
}

.topic-chip:hover {
  filter: brightness(0.97);
}

.topic-chip:focus-visible {
  outline: 3px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.topic-chip--active {
  background: var(--topic-color);
  border-color: var(--topic-color);
  color: #ffffff;
}

.topic-chip--active svg {
  color: #ffffff;
}
</style>
