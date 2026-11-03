<script setup lang="ts">
import type { Layer } from '@ecomap/shared';
import { mdiChevronDown } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { isOnlyLayer, layersAfterChip, type MapFilters } from './filters.js';
import { layerIconPath } from './layerIcons.js';

/**
 * A row of topics over the map - the quick way in, like the "Restaurants ·
 * Hotels" row on a big map app. Tapping a topic shows only that layer; tapping
 * it again goes back to the starting view. The layer list in the side panel
 * stays for combining several.
 *
 * As many topics as fit the width are shown; the rest go into a "More" menu,
 * so the row never runs off the edge of the screen.
 */
const props = defineProps<{ layers: readonly Layer[]; filters: MapFilters }>();
const emit = defineEmits<{ 'update:filters': [filters: MapFilters] }>();

const { t } = useTranslation();

const nav = useTemplateRef<HTMLElement>('nav');
const measure = useTemplateRef<HTMLElement>('measure');

const topics = computed(() => props.layers.filter((layer) => layer.isPublished));
const visibleCount = ref(Number.POSITIVE_INFINITY);
const shown = computed(() => topics.value.slice(0, visibleCount.value));
const hidden = computed(() => topics.value.slice(visibleCount.value));
/* A topic picked from the menu is named on the menu's chip, so it stays visible. */
const hiddenActive = computed(
  () => hidden.value.find((layer) => isOnlyLayer(props.filters, layer.slug)) ?? null,
);

const pick = (slug: string): void => {
  emit('update:filters', { ...props.filters, layers: layersAfterChip(props.filters, slug) });
};

/** Must match `gap` in the styles below. */
const GAP = 8;
/** Must match `max-width` of `.topic-chip--more` below. */
const MORE_MAX_WIDTH = 240;

/**
 * Fits the chips to the row, using an invisible copy of every chip (and of the
 * "More" chip) to know their widths without the visible row jumping about.
 */
function layout(): void {
  const row = nav.value;
  const copies = measure.value;
  if (!row || !copies) return;

  const available = row.clientWidth;
  const widths = [...copies.querySelectorAll<HTMLElement>('[data-chip]')].map(
    (chip) => chip.offsetWidth,
  );
  const total = widths.reduce((sum, width) => sum + width, 0) + GAP * (widths.length - 1);
  if (total <= available) {
    visibleCount.value = widths.length;
    return;
  }

  const fitting = (reserved: number): number => {
    let used = reserved;
    let count = 0;
    for (const width of widths) {
      if (used + GAP + width > available) break;
      used += GAP + width;
      count += 1;
    }
    return count;
  };

  const moreWidth = copies.querySelector<HTMLElement>('[data-more]')?.offsetWidth ?? 0;
  let count = fitting(moreWidth);

  /* An active topic in the menu puts its name on the menu chip: make room for it. */
  const active = topics.value.findIndex((layer) => isOnlyLayer(props.filters, layer.slug));
  if (active >= count) {
    /* Its icon and name, plus the menu arrow. */
    count = fitting(Math.max(moreWidth, Math.min(MORE_MAX_WIDTH, (widths[active] ?? 0) + 20)));
  }
  visibleCount.value = count;
}

/* Both: the row changes with the window, the copies when the web font arrives. */
const observer = new ResizeObserver(() => {
  layout();
});

onMounted(() => {
  if (nav.value) observer.observe(nav.value);
  if (measure.value) observer.observe(measure.value);
  layout();
});

onBeforeUnmount(() => {
  observer.disconnect();
});

watch([topics, () => props.filters], async () => {
  await nextTick();
  layout();
});
</script>

<template>
  <nav ref="nav" class="topic-chips" :aria-label="t('map.topics')">
    <button
      v-for="layer in shown"
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

    <v-menu v-if="hidden.length > 0" location="bottom end">
      <template #activator="{ props: menuProps }">
        <button
          type="button"
          class="topic-chip topic-chip--more"
          :class="{ 'topic-chip--active': hiddenActive !== null }"
          :style="hiddenActive ? { '--topic-color': hiddenActive.color } : undefined"
          v-bind="menuProps"
        >
          <svg
            v-if="hiddenActive"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            aria-hidden="true"
            focusable="false"
          >
            <path :d="layerIconPath(hiddenActive.icon)" fill="currentColor" />
          </svg>
          <span class="topic-chip__label">{{
            hiddenActive?.name ?? t('map.moreTopics', { count: hidden.length })
          }}</span>
          <v-icon :icon="mdiChevronDown" size="18" />
        </button>
      </template>
      <v-list density="compact" class="py-1">
        <v-list-item
          v-for="layer in hidden"
          :key="layer.id"
          :active="isOnlyLayer(props.filters, layer.slug)"
          color="primary"
          @click="pick(layer.slug)"
        >
          <template #prepend>
            <svg
              class="mr-3"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              aria-hidden="true"
              focusable="false"
              :style="{ color: layer.color }"
            >
              <path :d="layerIconPath(layer.icon)" fill="currentColor" />
            </svg>
          </template>
          <v-list-item-title>{{ layer.name }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>

    <!-- Invisible copies, only for measuring how many chips fit. -->
    <div ref="measure" class="topic-chips__measure" aria-hidden="true" inert>
      <span v-for="layer in topics" :key="layer.id" class="topic-chip" data-chip>
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path :d="layerIconPath(layer.icon)" />
        </svg>
        <span>{{ layer.name }}</span>
      </span>
      <span class="topic-chip topic-chip--more" data-more>
        <span>{{ t('map.moreTopics', { count: topics.length }) }}</span>
        <svg viewBox="0 0 24 24" width="18" height="18" />
      </span>
    </div>
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
  padding: 2px 0 6px;
  pointer-events: none;
}

.topic-chips__measure {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  gap: 8px;
  visibility: hidden;
  pointer-events: none;
}

.topic-chip--more {
  padding: 0 8px 0 14px;
  gap: 2px;
  max-width: 240px;
}

.topic-chip__label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.topic-chip--more .v-icon {
  color: inherit;
}

/* The menu chip named after a topic picked from it: same look as the others. */
.topic-chip--more.topic-chip--active {
  padding-left: 10px;
  gap: 6px;
}
</style>
