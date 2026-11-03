<script setup lang="ts">
import {
  FEATURE_IMAGE_MAX_BYTES,
  FEATURE_IMAGE_MAX_COUNT,
  FEATURE_IMAGE_MAX_DIMENSION,
  type Feature,
} from '@ecomap/shared';
import { mdiClose, mdiImagePlus, mdiUndo } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { computed, ref, useId, useTemplateRef } from 'vue';
import FeatureImageView from '../images/FeatureImageView.vue';
import { ImagePreparationError, prepareImage } from '../images/encode.js';
import type { PhotoChanges } from './photos.js';

/**
 * The photo part of the contribution form. Nothing is uploaded here: new
 * photos are shrunk in the browser and kept until the form is saved, so
 * cancelling the form really does discard them.
 */
const changes = defineModel<PhotoChanges>({ required: true });
const props = defineProps<{ existing: Feature | null }>();

const { t } = useTranslation();
const headingId = useId();
const fileInput = useTemplateRef<HTMLInputElement>('fileInput');

const preparing = ref(0);
const errors = ref<string[]>([]);
let nextKey = 0;

const stored = computed(() => props.existing?.images ?? []);
const isPublic = computed(() => props.existing?.status === 'published');
const kept = computed(
  () => stored.value.filter((image) => !changes.value.removedIds.includes(image.id)).length,
);
const total = computed(() => kept.value + changes.value.added.length + preparing.value);
const room = computed(() => FEATURE_IMAGE_MAX_COUNT - total.value);

const isRemoved = (id: string): boolean => changes.value.removedIds.includes(id);

const altOf = (id: string, original: string): string => changes.value.altChanges[id] ?? original;

const setStoredAlt = (id: string, alt: string): void => {
  changes.value = { ...changes.value, altChanges: { ...changes.value.altChanges, [id]: alt } };
};

const toggleStored = (id: string): void => {
  const removedIds = isRemoved(id)
    ? changes.value.removedIds.filter((removed) => removed !== id)
    : [...changes.value.removedIds, id];
  changes.value = { ...changes.value, removedIds };
};

const setAddedAlt = (key: string, alt: string): void => {
  changes.value = {
    ...changes.value,
    added: changes.value.added.map((photo) => (photo.key === key ? { ...photo, alt } : photo)),
  };
};

const dropAdded = (key: string): void => {
  const photo = changes.value.added.find((candidate) => candidate.key === key);
  if (photo) URL.revokeObjectURL(photo.previewUrl);
  changes.value = {
    ...changes.value,
    added: changes.value.added.filter((candidate) => candidate.key !== key),
  };
};

const reasonText = (caught: unknown): string => {
  const reason = caught instanceof ImagePreparationError ? caught.reason : 'unreadable';
  return t(`photos.errors.${reason}`);
};

const onFiles = async (event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement;
  const files = [...(input.files ?? [])];
  input.value = '';
  errors.value = [];

  const accepted = files.slice(0, Math.max(0, room.value));
  if (files.length > accepted.length) {
    errors.value.push(t('photos.tooMany', { count: FEATURE_IMAGE_MAX_COUNT }));
  }

  for (const file of accepted) {
    preparing.value += 1;
    try {
      const blob = await prepareImage(file, {
        maxDimension: FEATURE_IMAGE_MAX_DIMENSION,
        maxBytes: FEATURE_IMAGE_MAX_BYTES,
      });
      nextKey += 1;
      changes.value = {
        ...changes.value,
        added: [
          ...changes.value.added,
          { key: String(nextKey), blob, previewUrl: URL.createObjectURL(blob), alt: '' },
        ],
      };
    } catch (caught) {
      errors.value.push(`${file.name}: ${reasonText(caught)}`);
    } finally {
      preparing.value -= 1;
    }
  }
};
</script>

<template>
  <section :aria-labelledby="headingId" class="d-flex flex-column ga-3">
    <div class="d-flex align-center ga-2">
      <h3 :id="headingId" class="text-title-small flex-grow-1">
        {{ t('photos.title') }}
        <span class="text-medium-emphasis"
          >({{ kept + changes.added.length }}/{{ FEATURE_IMAGE_MAX_COUNT }})</span
        >
      </h3>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        class="d-none"
        :aria-label="t('photos.add')"
        @change="onFiles"
      />
      <v-btn
        variant="outlined"
        size="small"
        color="primary"
        :prepend-icon="mdiImagePlus"
        :disabled="room <= 0"
        :loading="preparing > 0"
        @click="fileInput?.click()"
      >
        {{ t('photos.add') }}
      </v-btn>
    </div>

    <p class="text-body-small text-medium-emphasis">{{ t('photos.help') }}</p>

    <v-alert v-for="message in errors" :key="message" type="warning" density="compact">
      {{ message }}
    </v-alert>

    <ul class="photo-list">
      <li
        v-for="image in stored"
        :key="image.id"
        class="photo"
        :class="{ 'photo--removed': isRemoved(image.id) }"
      >
        <div class="photo__thumb">
          <FeatureImageView
            :image="image"
            :is-public="isPublic"
            :fallback-alt="props.existing?.name ?? ''"
          />
        </div>
        <v-text-field
          :model-value="altOf(image.id, image.alt)"
          :label="t('photos.alt')"
          :disabled="isRemoved(image.id)"
          density="compact"
          hide-details
          maxlength="300"
          @update:model-value="(alt: string) => setStoredAlt(image.id, alt)"
        />
        <v-btn
          :icon="isRemoved(image.id) ? mdiUndo : mdiClose"
          variant="text"
          size="small"
          :aria-label="isRemoved(image.id) ? t('photos.keep') : t('photos.remove')"
          :title="isRemoved(image.id) ? t('photos.keep') : t('photos.remove')"
          @click="toggleStored(image.id)"
        />
      </li>

      <li v-for="photo in changes.added" :key="photo.key" class="photo">
        <div class="photo__thumb">
          <img :src="photo.previewUrl" :alt="photo.alt || t('photos.newPhoto')" />
        </div>
        <v-text-field
          :model-value="photo.alt"
          :label="t('photos.alt')"
          density="compact"
          hide-details
          maxlength="300"
          @update:model-value="(alt: string) => setAddedAlt(photo.key, alt)"
        />
        <v-btn
          :icon="mdiClose"
          variant="text"
          size="small"
          :aria-label="t('photos.remove')"
          :title="t('photos.remove')"
          @click="dropAdded(photo.key)"
        />
      </li>
    </ul>
  </section>
</template>

<style scoped>
.photo-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.photo {
  display: grid;
  grid-template-columns: 72px 1fr auto;
  align-items: center;
  gap: 12px;
}

.photo--removed .photo__thumb {
  opacity: 0.35;
}

.photo__thumb {
  width: 72px;
  height: 54px;
  border-radius: 6px;
  overflow: hidden;
}

.photo__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
