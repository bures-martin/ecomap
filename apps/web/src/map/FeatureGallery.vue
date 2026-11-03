<script setup lang="ts">
import type { Feature } from '@ecomap/shared';
import { mdiChevronLeft, mdiChevronRight, mdiClose } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import FeatureImageView from '../images/FeatureImageView.vue';

/**
 * A contribution's photos: a grid of thumbnails, each opening a full-size
 * viewer with its description as the caption. Arrow keys step through them.
 */
const props = defineProps<{ feature: Feature }>();

const { t } = useTranslation();

const images = computed(() => props.feature.images);
const isPublic = computed(() => props.feature.status === 'published');
const openIndex = ref<number | null>(null);
const current = computed(() =>
  openIndex.value === null ? undefined : images.value[openIndex.value],
);

const step = (by: number): void => {
  if (openIndex.value === null || images.value.length === 0) return;
  openIndex.value = (openIndex.value + by + images.value.length) % images.value.length;
};

const viewerOpen = computed({
  get: () => openIndex.value !== null,
  set: (value: boolean) => {
    if (!value) openIndex.value = null;
  },
});

/*
 * Arrow keys step through the photos. Listened for on the whole page while
 * the viewer is open: the dialog moves focus to its own wrapper, outside any
 * element of ours that could catch the key.
 */
const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'ArrowLeft') step(-1);
  else if (event.key === 'ArrowRight') step(1);
  else return;
  event.preventDefault();
};

watch(viewerOpen, (open) => {
  if (open) window.addEventListener('keydown', onKeydown);
  else window.removeEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <div v-if="images.length > 0">
    <ul class="gallery" :class="{ 'gallery--single': images.length === 1 }">
      <li v-for="(image, index) in images" :key="image.id">
        <button
          type="button"
          class="gallery__item"
          :aria-label="
            t('photos.open', { index: index + 1, count: images.length, alt: image.alt || '' })
          "
          @click="openIndex = index"
        >
          <FeatureImageView
            :image="image"
            :is-public="isPublic"
            :fallback-alt="props.feature.name"
          />
        </button>
      </li>
    </ul>

    <v-dialog v-model="viewerOpen" max-width="1100">
      <v-card v-if="current" class="viewer">
        <div class="viewer__image">
          <FeatureImageView
            :image="current"
            :is-public="isPublic"
            :fallback-alt="props.feature.name"
            fit="contain"
          />
        </div>
        <div class="d-flex align-center ga-2 pa-3">
          <p class="flex-grow-1 text-body-medium">
            {{ current.alt }}
            <span class="text-medium-emphasis text-body-small">
              {{ t('photos.position', { index: (openIndex ?? 0) + 1, count: images.length }) }}
            </span>
          </p>
          <template v-if="images.length > 1">
            <v-btn
              :icon="mdiChevronLeft"
              variant="text"
              :aria-label="t('photos.previous')"
              @click="step(-1)"
            />
            <v-btn
              :icon="mdiChevronRight"
              variant="text"
              :aria-label="t('photos.next')"
              @click="step(1)"
            />
          </template>
          <v-btn
            :icon="mdiClose"
            variant="text"
            :aria-label="t('app.close')"
            @click="openIndex = null"
          />
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.gallery {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.gallery--single {
  grid-template-columns: 1fr;
}

.gallery__item {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  padding: 0;
  border: 0;
  border-radius: 6px;
  overflow: hidden;
  cursor: zoom-in;
  background: none;
}

.gallery--single .gallery__item {
  aspect-ratio: 16 / 9;
}

.gallery__item:focus-visible {
  outline: 3px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.viewer__image {
  height: min(75vh, 800px);
  background: #111;
}
</style>
