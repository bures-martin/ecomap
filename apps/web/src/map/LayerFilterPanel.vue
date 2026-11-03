<script setup lang="ts">
import { FEATURE_STATUSES, type FeatureStatus, type Layer } from '@ecomap/shared';
import { mdiMagnify } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { computed, useId } from 'vue';
import { useAuth } from '../auth/auth.js';
import { EMPTY_FILTERS, hasActiveFilters, type MapFilters } from './filters.js';

/**
 * Everything that narrows what the map shows. Each control writes straight into
 * the URL, so the panel has no state of its own beyond the search box's own
 * debounce, which lives in the page.
 */
const props = defineProps<{
  layers: readonly Layer[];
  filters: MapFilters;
  searchDraft: string;
  shown: number;
  total: number;
  /**
   * While a search is active: how many of the matching places sit in each
   * layer, by slug. Null when nothing is being searched for.
   */
  matches: ReadonlyMap<string, number> | null;
}>();
const emit = defineEmits<{
  'update:searchDraft': [value: string];
  'update:filters': [filters: MapFilters];
}>();

const { t } = useTranslation();
const auth = useAuth();
const headingId = useId();

const toggleLayer = (slug: string, checked: boolean | null): void => {
  const next = checked
    ? [...props.filters.layers, slug]
    : props.filters.layers.filter((current) => current !== slug);
  emit('update:filters', { ...props.filters, layers: next });
};

const statusItems = computed(() => [
  { title: t('map.anyStatus'), value: '' },
  ...FEATURE_STATUSES.map((status) => ({ title: t(`feature.status.${status}`), value: status })),
]);

const isFeatureStatus = (value: string): value is FeatureStatus =>
  FEATURE_STATUSES.some((status) => status === value);

const onStatus = (value: string): void => {
  emit('update:filters', { ...props.filters, status: isFeatureStatus(value) ? value : null });
};

/*
 * The search box covers layers and places alike. While it is in use, the list
 * keeps the layers whose name matches, the layers holding a matching place,
 * and any layer already ticked - so a tick can always be undone.
 */
const searching = computed(() => props.matches !== null);
const visibleLayers = computed(() => {
  const matches = props.matches;
  if (!matches) return props.layers;
  const term = props.filters.q.trim().toLocaleLowerCase();
  /* The same rule as the server: a layer name matches from the start of a word. */
  const startsAWord = (name: string): boolean =>
    name
      .toLocaleLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .some((word) => word.startsWith(term));
  return props.layers.filter(
    (layer) =>
      matches.has(layer.slug) ||
      startsAWord(layer.name) ||
      props.filters.layers.includes(layer.slug),
  );
});
const countFor = (layer: Layer): number =>
  props.matches ? (props.matches.get(layer.slug) ?? 0) : layer.featureCount;

const clearFilters = (): void => {
  emit('update:searchDraft', '');
  emit('update:filters', { ...EMPTY_FILTERS, layers: [] });
};
</script>

<template>
  <div class="d-flex flex-column ga-4 pa-4 filter-panel">
    <v-text-field
      :model-value="props.searchDraft"
      :label="t('map.searchLabel')"
      :placeholder="t('map.searchPlaceholder')"
      type="search"
      :prepend-inner-icon="mdiMagnify"
      hide-details
      @update:model-value="(value: string) => emit('update:searchDraft', value)"
    />

    <section :aria-labelledby="headingId">
      <h2 :id="headingId" class="text-title-small mb-1">{{ t('map.layersHeading') }}</h2>

      <p
        v-if="searching && visibleLayers.length === 0"
        class="text-body-small text-medium-emphasis"
      >
        {{ t('map.noMatches') }}
      </p>

      <v-checkbox
        v-for="layer in visibleLayers"
        :key="layer.id"
        :model-value="props.filters.layers.includes(layer.slug)"
        :color="layer.color"
        :base-color="layer.color"
        density="compact"
        hide-details
        @update:model-value="(checked: boolean | null) => toggleLayer(layer.slug, checked)"
      >
        <template #label>
          <span class="d-flex align-center ga-2">
            <span class="color-dot" :style="{ background: layer.color }" aria-hidden="true" />
            <span>{{ layer.name }}</span>
            <v-chip
              size="x-small"
              :color="searching ? 'primary' : undefined"
              :title="searching ? t('map.matchesInLayer') : undefined"
            >
              {{ countFor(layer) }}
            </v-chip>
            <v-chip v-if="!layer.isPublished" size="x-small" color="warning">hidden</v-chip>
          </span>
        </template>
      </v-checkbox>

      <p v-if="props.filters.layers.length === 0" class="text-body-small text-medium-emphasis">
        {{ t('map.allLayers') }}
      </p>
    </section>

    <template v-if="auth.user !== null || auth.can('feature:moderate')">
      <v-divider />
      <div class="d-flex flex-column ga-3">
        <v-checkbox
          v-if="auth.user"
          :model-value="props.filters.mine"
          :label="t('map.onlyMine')"
          hide-details
          @update:model-value="
            (checked: boolean | null) =>
              emit('update:filters', { ...props.filters, mine: checked === true })
          "
        />

        <v-select
          v-if="auth.can('feature:moderate')"
          :model-value="props.filters.status ?? ''"
          :items="statusItems"
          :label="t('map.statusFilter')"
          hide-details
          @update:model-value="onStatus"
        />
      </div>
    </template>

    <v-divider />

    <div class="d-flex flex-column ga-2">
      <p class="text-body-medium text-medium-emphasis" aria-live="polite">
        {{ t('map.showingCount', { shown: props.shown, total: props.total }) }}
      </p>
      <v-btn
        v-if="hasActiveFilters(props.filters)"
        size="small"
        variant="text"
        @click="clearFilters"
      >
        {{ t('map.clearFilters') }}
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
.filter-panel {
  height: 100%;
  overflow-y: auto;
}

/* Vuetify inputs grow to fill a flex column; here each keeps its natural height. */
.filter-panel > :deep(.v-input) {
  flex: 0 0 auto;
}
</style>
