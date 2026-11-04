<script setup lang="ts">
import type { Feature, Layer } from '@ecomap/shared';
import { useTranslation } from 'i18next-vue';
import { ref } from 'vue';
import type { MapFilters } from './filters.js';
import LayerFilterPanel from './LayerFilterPanel.vue';
import PlaceList from './PlaceList.vue';
import type { ListedPlace } from './placeList.js';

/**
 * The panel beside the map (a drawer on phones): the filters, and the places on
 * screen as a list. Both follow the same filters, so the list always matches
 * the pins.
 */
const props = defineProps<{
  layers: readonly Layer[];
  filters: MapFilters;
  searchDraft: string;
  shown: number;
  total: number;
  matches: ReadonlyMap<string, number> | null;
  places: readonly ListedPlace[];
  placesTotal: number;
  layersBySlug: ReadonlyMap<string, Layer>;
  fromPerson: boolean;
}>();
const emit = defineEmits<{
  'update:searchDraft': [value: string];
  'update:filters': [filters: MapFilters];
  select: [feature: Feature];
}>();

const { t } = useTranslation();
const tab = ref<'filters' | 'places'>('filters');
</script>

<template>
  <div class="side-panel">
    <v-tabs v-model="tab" grow density="comfortable" color="primary" class="side-panel__tabs">
      <v-tab value="filters">{{ t('map.filters') }}</v-tab>
      <v-tab value="places">{{ t('placeList.tab', { count: props.placesTotal }) }}</v-tab>
    </v-tabs>

    <div class="side-panel__body">
      <LayerFilterPanel
        v-if="tab === 'filters'"
        :search-draft="props.searchDraft"
        :layers="props.layers"
        :filters="props.filters"
        :shown="props.shown"
        :total="props.total"
        :matches="props.matches"
        @update:search-draft="(value: string) => emit('update:searchDraft', value)"
        @update:filters="(filters: MapFilters) => emit('update:filters', filters)"
      />
      <PlaceList
        v-else
        :places="props.places"
        :total="props.placesTotal"
        :layers-by-slug="props.layersBySlug"
        :from-person="props.fromPerson"
        @select="(feature: Feature) => emit('select', feature)"
      />
    </div>
  </div>
</template>

<style scoped>
.side-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.side-panel__tabs {
  flex: 0 0 auto;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.side-panel__body {
  flex: 1;
  min-height: 0;
}
</style>
