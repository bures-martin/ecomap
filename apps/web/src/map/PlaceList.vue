<script setup lang="ts">
import type { Feature, Layer } from '@ecomap/shared';
import { useTranslation } from 'i18next-vue';
import { useLanguage } from '../i18n/index.js';
import LayerIcon from './LayerIcon.vue';
import { formatDistance, type ListedPlace } from './placeList.js';

/**
 * The places on screen as a list: the accessible way to browse the map (no
 * hunting for pins), and the easy one on a phone. Every row opens the place
 * exactly as its pin does.
 */
const props = defineProps<{
  places: readonly ListedPlace[];
  total: number;
  layersBySlug: ReadonlyMap<string, Layer>;
  /** Distances are shown once they mean "from you", not "from the map's middle". */
  fromPerson: boolean;
}>();
const emit = defineEmits<{ select: [feature: Feature] }>();

const { t } = useTranslation();
const language = useLanguage();
</script>

<template>
  <div class="place-list pa-2">
    <p class="text-body-small text-medium-emphasis px-2 py-2" aria-live="polite">
      <template v-if="props.total === 0">{{ t('placeList.empty') }}</template>
      <template v-else-if="props.total > props.places.length">
        {{ t('placeList.someShown', { shown: props.places.length, total: props.total }) }}
      </template>
      <template v-else>{{ t('placeList.allShown', { count: props.total }) }}</template>
    </p>

    <ul class="place-list__items">
      <li v-for="{ feature, distanceKm } in props.places" :key="feature.id">
        <button
          type="button"
          class="place-row"
          :data-place-id="feature.id"
          @click="emit('select', feature)"
        >
          <LayerIcon
            :icon="props.layersBySlug.get(feature.layerSlug)?.icon ?? 'pin'"
            :color="props.layersBySlug.get(feature.layerSlug)?.color ?? 'currentColor'"
          />
          <span class="place-row__text">
            <span class="place-row__name">{{ feature.name }}</span>
            <span class="place-row__layer">
              {{ props.layersBySlug.get(feature.layerSlug)?.name ?? '' }}
            </span>
          </span>
          <span v-if="props.fromPerson" class="place-row__distance">
            {{ formatDistance(distanceKm, language) }}
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.place-list {
  height: 100%;
  overflow-y: auto;
}

.place-list__items {
  list-style: none;
  padding: 0;
  margin: 0;
}

.place-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  padding: 8px;
  border-radius: 8px;
  text-align: left;
  color: inherit;
  font: inherit;
  /* A row of a list, not a raised button. */
  background: transparent;
  border: 0;
  cursor: pointer;
}

.place-list__items li + li {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.place-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.05);
}

.place-row:focus-visible {
  outline: 3px solid rgb(var(--v-theme-primary));
  outline-offset: -3px;
}

.place-row__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.place-row__name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.place-row__layer,
.place-row__distance {
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.place-row__distance {
  white-space: nowrap;
}
</style>
