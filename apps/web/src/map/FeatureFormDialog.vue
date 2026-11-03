<script setup lang="ts">
import type { Feature, Geometry, Layer, PropertyBag } from '@ecomap/shared';
import { useTranslation } from 'i18next-vue';
import { computed, ref, watch } from 'vue';
import { fieldIssues, useApiErrorMessage } from '../composables/useApiErrorMessage.js';
import type { FeatureFormValues } from './featureForm.js';
import LayerFieldInput from './LayerFieldInput.vue';

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
}>();
const emit = defineEmits<{ submit: [values: FeatureFormValues]; cancel: [] }>();

const { t } = useTranslation();
const errorMessage = useApiErrorMessage();

const values = ref<FeatureFormValues>(emptyValues());

/* Reload the form whenever it opens for a different feature. */
watch(
  () => [props.open, props.existing] as const,
  ([open, existing]) => {
    if (!open) return;
    values.value = existing
      ? {
          name: existing.name,
          description: existing.description,
          properties: { ...existing.properties },
          isDraft: existing.status === 'draft',
        }
      : emptyValues();
  },
  { immediate: true },
);

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
  return { name: '', description: '', properties: {}, isDraft: false };
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
              ? t('feature.editTitle', { name: props.existing.name })
              : t('feature.addTitle', { layer: props.layer.name })
          }}
        </v-card-title>

        <v-card-text class="d-flex flex-column ga-4">
          <v-alert v-if="hasError" type="error">{{ errorMessage(props.error) }}</v-alert>

          <v-alert
            v-if="props.layer.description && !props.existing"
            type="info"
            :icon="false"
            variant="tonal"
          >
            {{ props.layer.description }}
          </v-alert>

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
            {{ props.existing ? t('feature.submitEdit') : t('feature.submit') }}
          </v-btn>
        </v-card-actions>
      </form>
    </v-card>
  </v-dialog>
</template>
