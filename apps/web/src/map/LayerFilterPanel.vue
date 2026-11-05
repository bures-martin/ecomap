<script setup lang="ts">
import { FEATURE_STATUSES, type FeatureStatus, type Layer } from '@ecomap/shared';
import { mdiFilterRemoveOutline, mdiMagnify, mdiShareVariant } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { computed, ref, useId } from 'vue';
import { useAuth } from '../auth/auth.js';
import ShareDialog from '../components/ShareDialog.vue';
import {
  EMPTY_FILTERS,
  hasActiveFilters,
  layersAfterToggle,
  writeFilters,
  type MapFilters,
} from './filters.js';
import LayerIcon from './LayerIcon.vue';

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
  emit('update:filters', {
    ...props.filters,
    layers: layersAfterToggle(props.filters, props.layers, slug, checked === true),
  });
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

/*
 * Offered as soon as anything is ticked, typed or set (the search box counts
 * before its debounce catches up), and takes the map back to showing everything.
 */
const anythingSelected = computed(
  () => hasActiveFilters(props.filters) || props.searchDraft.trim() !== '',
);

/*
 * Sharing the map as filtered now. Only layers and search travel - "only mine"
 * and a moderator's status filter are personal - so the button only says
 * "this view" when one of those two is set.
 */
const sharing = ref(false);
const shareQuery = computed(() => writeFilters(props.filters, new URLSearchParams()).toString());
const hasShareableFilters = computed(
  () => props.filters.layers.length > 0 || props.filters.q.trim() !== '',
);

const clearFilters = (): void => {
  emit('update:searchDraft', '');
  emit('update:filters', EMPTY_FILTERS);
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
      <!-- Clearing sits next to what it clears, and only when there is something to clear. -->
      <div class="d-flex align-center justify-space-between ga-2 mb-1">
        <h2 :id="headingId" class="text-title-small">{{ t('map.layersHeading') }}</h2>
        <v-btn
          v-if="anythingSelected"
          size="small"
          variant="tonal"
          color="primary"
          :prepend-icon="mdiFilterRemoveOutline"
          @click="clearFilters"
        >
          {{ t('map.clearFilters') }}
        </v-btn>
      </div>

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
            <LayerIcon :icon="layer.icon" :color="layer.color" />
            <span>{{ layer.name }}</span>
            <v-chip
              size="x-small"
              :color="searching ? 'primary' : undefined"
              :title="searching ? t('map.matchesInLayer') : undefined"
            >
              {{ countFor(layer) }}
            </v-chip>
            <v-chip v-if="!layer.isPublished" size="x-small" color="warning">
              {{ t('layerAdmin.hiddenChip') }}
            </v-chip>
          </span>
        </template>
      </v-checkbox>

      <p
        v-if="props.filters.layers.length === 0 && !searching"
        class="text-body-small text-medium-emphasis"
      >
        {{ t('map.allLayersShown') }}
      </p>
    </section>

    <!-- The map as filtered now (layers and search) - e.g. only local food, for a brochure. -->
    <div>
      <v-btn
        variant="tonal"
        color="primary"
        :prepend-icon="mdiShareVariant"
        @click="sharing = true"
      >
        {{ hasShareableFilters ? t('share.filteredMapButton') : t('share.mapButton') }}
      </v-btn>
    </div>
    <ShareDialog
      :open="sharing"
      :heading="hasShareableFilters ? t('share.filteredMapHeading') : t('share.mapHeading')"
      :title="t('share.mapShareTitle')"
      :query="shareQuery"
      @close="sharing = false"
    />

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

    <!--
      Not shown (the "Steder" tab carries the count), but read out to screen
      readers whenever a filter changes the result - a status message.
    -->
    <p class="d-sr-only" aria-live="polite">
      {{ t('map.showingCount', { shown: props.shown, total: props.total }) }}
    </p>
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
