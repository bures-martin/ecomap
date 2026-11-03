<script setup lang="ts">
import { FIELD_TYPES, layerFieldSchema, type LayerField } from '@ecomap/shared';
import { mdiDelete, mdiPlus } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { computed, useId } from 'vue';

/** The custom fields of a layer - each one becomes an input in the contribute form. */
const fields = defineModel<LayerField[]>('fields', { required: true });

const { t } = useTranslation();
const headingId = useId();

const typeItems = computed(() =>
  FIELD_TYPES.map((type) => ({ title: t(`layerAdmin.fieldTypes.${type}`), value: type })),
);

const updateField = (index: number, patch: Partial<LayerField>): void => {
  fields.value = fields.value.map((field, i) => (i === index ? { ...field, ...patch } : field));
};

const parseOptions = (text: string): string[] =>
  text
    .split('\n')
    .map((option) => option.trim())
    .filter((option) => option.length > 0);

const removeField = (index: number): void => {
  fields.value = fields.value.filter((_, i) => i !== index);
};

const addField = (): void => {
  fields.value = [
    ...fields.value,
    layerFieldSchema.parse({
      key: `field${String(fields.value.length + 1)}`,
      label: '',
      type: 'text',
    }),
  ];
};
</script>

<template>
  <section :aria-labelledby="headingId">
    <p :id="headingId" class="text-title-small">{{ t('layerAdmin.fields') }}</p>
    <p class="text-body-small text-medium-emphasis mb-2">{{ t('layerAdmin.fieldsIntro') }}</p>

    <div class="d-flex flex-column ga-4">
      <v-sheet
        v-for="(field, index) in fields"
        :key="`${field.key}-${String(index)}`"
        border
        rounded
        class="pa-4 d-flex flex-column ga-3"
      >
        <div class="responsive-row">
          <v-text-field
            :model-value="field.label"
            :label="t('layerAdmin.fieldLabel')"
            hide-details
            @update:model-value="(label: string) => updateField(index, { label })"
          />
          <v-text-field
            :model-value="field.key"
            :label="t('layerAdmin.fieldKey')"
            hide-details
            @update:model-value="(key: string) => updateField(index, { key })"
          />
          <v-select
            :model-value="field.type"
            :items="typeItems"
            :label="t('layerAdmin.fieldType')"
            hide-details
            @update:model-value="(type: LayerField['type']) => updateField(index, { type })"
          />
        </div>

        <v-textarea
          v-if="field.type === 'select'"
          :model-value="field.options.join('\n')"
          :label="t('layerAdmin.fieldOptions')"
          :hint="t('layerAdmin.fieldOptionsHelp')"
          persistent-hint
          rows="2"
          auto-grow
          @update:model-value="
            (text: string) => updateField(index, { options: parseOptions(text) })
          "
        />

        <div class="d-flex align-center ga-2">
          <v-checkbox
            :model-value="field.required"
            :label="t('layerAdmin.fieldRequired')"
            hide-details
            @update:model-value="
              (required: boolean | null) => updateField(index, { required: required === true })
            "
          />
          <v-spacer />
          <v-btn
            :icon="mdiDelete"
            variant="text"
            :aria-label="t('layerAdmin.removeField')"
            @click="removeField(index)"
          />
        </div>
      </v-sheet>

      <div>
        <v-btn variant="text" :prepend-icon="mdiPlus" @click="addField">{{
          t('layerAdmin.addField')
        }}</v-btn>
      </div>
    </div>
  </section>
</template>
