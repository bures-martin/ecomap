<script setup lang="ts">
import type { Feature, Geometry, Layer, PropertyBag } from '@ecomap/shared';
import { useTranslation } from 'i18next-vue';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useCommunitySettings } from '../api/queries.js';
import { fieldIssues, useApiErrorMessage } from '../composables/useApiErrorMessage.js';
import { useLanguage } from '../i18n/index.js';
import type { FeatureFormValues } from './featureForm.js';
import LayerFieldInput from './LayerFieldInput.vue';
import PhotoPicker from './PhotoPicker.vue';
import { emptyPhotoChanges, releasePhotoPreviews } from './photos.js';

/**
 * The contribution form.
 *
 * The fields below name and description are generated from the layer's own
 * definition, which is the point of the whole design: adding a field to a layer
 * changes this form with no code change.
 */

const props = defineProps<{
  open: boolean;
  layer: Layer | undefined;
  /** The drawn geometry for a new contribution; absent when editing text only. */
  geometry: Geometry | null;
  existing: Feature | null;
  submitting: boolean;
  error: unknown;
  /**
   * The change goes in as a suggestion for a moderator to approve: the place
   * stays as it is meanwhile, and photos are not part of it.
   */
  suggesting?: boolean;
}>();
const emit = defineEmits<{ submit: [values: FeatureFormValues]; cancel: [] }>();

const { t } = useTranslation();
const errorMessage = useApiErrorMessage();
const settingsQuery = useCommunitySettings();
const language = useLanguage();

/**
 * A nudge towards the map's own language, for someone using the app in another
 * one: what people type is shown to everybody as written.
 */
const languageHint = computed(() => {
  const mapLanguage = settingsQuery.data.value?.defaultLocale;
  if (!mapLanguage || mapLanguage === language.value) return '';
  return t('feature.writeInLanguage', { language: t(`languages.${mapLanguage}`) });
});

const values = ref<FeatureFormValues>(emptyValues());

/* Reload the form whenever it opens for a different feature. */
watch(
  () => [props.open, props.existing] as const,
  ([open, existing]) => {
    if (!open) return;
    /* Previews of an earlier round are no longer shown; the blobs stay usable. */
    releasePhotoPreviews(values.value.photos);
    values.value = existing
      ? {
          name: existing.name,
          description: existing.description,
          properties: { ...existing.properties },
          isDraft: existing.status === 'draft',
          photos: emptyPhotoChanges(),
        }
      : emptyValues();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  releasePhotoPreviews(values.value.photos);
});

const issues = computed(() => fieldIssues(props.error));
const hasError = computed(() => props.error !== null && props.error !== undefined);
const canSubmit = computed(
  () =>
    values.value.name.trim().length >= 2 && (props.existing !== null || props.geometry !== null),
);

const messagesFor = (key: string): string[] => {
  const message = issues.value[key];
  return message ? [message] : [];
};

const setProperty = (key: string, value: PropertyBag[string]): void => {
  values.value = { ...values.value, properties: { ...values.value.properties, [key]: value } };
};

const submit = (): void => {
  emit('submit', values.value);
};

const onOpenChange = (value: boolean): void => {
  if (!value) emit('cancel');
};

function emptyValues(): FeatureFormValues {
  return { name: '', description: '', properties: {}, isDraft: false, photos: emptyPhotoChanges() };
}
</script>

<template>
  <v-dialog
    v-if="props.layer"
    :model-value="props.open"
    max-width="600"
    @update:model-value="onOpenChange"
  >
    <v-card>
      <form novalidate @submit.prevent="submit">
        <v-card-title>
          {{
            props.existing
              ? props.suggesting
                ? t('suggestion.title', { name: props.existing.name })
                : t('feature.editTitle', { name: props.existing.name })
              : t('feature.addTitle', { layer: props.layer.name })
          }}
        </v-card-title>

        <v-card-text class="d-flex flex-column ga-4">
          <v-alert v-if="hasError" type="error">{{ errorMessage(props.error) }}</v-alert>

          <v-alert
            v-if="props.existing && props.geometry"
            type="success"
            variant="tonal"
            density="compact"
          >
            {{ t('feature.movedNote') }}
          </v-alert>

          <v-alert v-if="props.suggesting" type="info" variant="tonal" density="compact">
            {{ t('suggestion.explain') }}
          </v-alert>

          <v-alert
            v-if="props.layer.description && !props.existing"
            type="info"
            :icon="false"
            variant="tonal"
          >
            {{ props.layer.description }}
          </v-alert>

          <p v-if="languageHint" class="text-body-small text-medium-emphasis">
            {{ languageHint }}
          </p>

          <v-text-field
            v-model="values.name"
            :label="t('feature.name')"
            required
            autofocus
            :error-messages="messagesFor('name')"
          />

          <v-textarea
            v-model="values.description"
            :label="t('feature.description')"
            rows="3"
            auto-grow
            :hint="t('feature.descriptionHelp')"
            persistent-hint
            :error-messages="messagesFor('description')"
          />

          <LayerFieldInput
            v-for="field in props.layer.fields"
            :key="field.key"
            :field="field"
            :value="values.properties[field.key]"
            :error="issues[`properties.${field.key}`] ?? issues[field.key]"
            @change="(value) => setProperty(field.key, value)"
          />

          <v-divider />
          <PhotoPicker
            v-if="!props.suggesting"
            v-model="values.photos"
            :existing="props.existing"
          />

          <v-checkbox
            v-if="!props.existing"
            :model-value="values.isDraft"
            :label="t('feature.saveAsDraft')"
            hide-details
            @update:model-value="(checked: boolean | null) => (values.isDraft = checked === true)"
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="emit('cancel')">{{ t('app.cancel') }}</v-btn>
          <v-btn
            type="submit"
            variant="flat"
            color="primary"
            :loading="props.submitting"
            :disabled="!canSubmit"
          >
            {{
              props.suggesting
                ? t('suggestion.submit')
                : props.existing
                  ? t('feature.submitEdit')
                  : t('feature.submit')
            }}
          </v-btn>
        </v-card-actions>
      </form>
    </v-card>
  </v-dialog>
</template>
