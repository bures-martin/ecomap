<script setup lang="ts">
import type { LayerField, PropertyBag } from '@ecomap/shared';
import { computed } from 'vue';
import OpeningHoursInput from './OpeningHoursInput.vue';

type PropertyValue = PropertyBag[string];

/** One input for one of a layer's own fields, chosen by the field's type. */
const props = defineProps<{
  field: LayerField;
  /** Undefined while the contributor has not touched this field yet. */
  value: PropertyValue | undefined;
  error: string | undefined;
}>();
const emit = defineEmits<{ change: [value: PropertyValue] }>();

const hint = computed(() => props.field.helpText || undefined);
const errorMessages = computed(() => (props.error ? [props.error] : []));
const textValue = computed(() => (typeof props.value === 'string' ? props.value : ''));

const selectItems = computed(() => [
  { title: '—', value: '' },
  ...props.field.options.map((option) => ({ title: option, value: option })),
]);

const inputType = computed(() =>
  props.field.type === 'date' ? 'date' : props.field.type === 'url' ? 'url' : 'text',
);

const onNumber = (raw: string): void => {
  emit('change', raw === '' ? null : Number(raw));
};

const onText = (raw: string): void => {
  emit('change', raw);
};

const onCheckbox = (checked: boolean | null): void => {
  emit('change', checked === true);
};
</script>

<template>
  <v-checkbox
    v-if="props.field.type === 'boolean'"
    :model-value="props.value === true"
    :label="props.field.label"
    :error-messages="errorMessages"
    :hint="hint"
    :persistent-hint="hint !== undefined"
    :hide-details="hint === undefined && errorMessages.length === 0"
    @update:model-value="onCheckbox"
  />

  <OpeningHoursInput
    v-else-if="props.field.type === 'openingHours'"
    :value="textValue"
    :label="props.field.label"
    :error="props.error"
    :hint="hint"
    @change="onText"
  />

  <v-select
    v-else-if="props.field.type === 'select'"
    :model-value="textValue"
    :items="selectItems"
    :label="props.field.label"
    :required="props.field.required"
    :error-messages="errorMessages"
    :hint="hint"
    :persistent-hint="hint !== undefined"
    @update:model-value="onText"
  />

  <v-text-field
    v-else-if="props.field.type === 'number'"
    type="number"
    :model-value="typeof props.value === 'number' ? String(props.value) : ''"
    :label="props.field.label"
    :required="props.field.required"
    :error-messages="errorMessages"
    :hint="hint"
    :persistent-hint="hint !== undefined"
    @update:model-value="onNumber"
  />

  <v-textarea
    v-else-if="props.field.type === 'longtext'"
    :model-value="textValue"
    :label="props.field.label"
    :required="props.field.required"
    :error-messages="errorMessages"
    :hint="hint"
    :persistent-hint="hint !== undefined"
    rows="3"
    auto-grow
    @update:model-value="onText"
  />

  <v-text-field
    v-else
    :type="inputType"
    :model-value="textValue"
    :label="props.field.label"
    :required="props.field.required"
    :error-messages="errorMessages"
    :hint="hint"
    :persistent-hint="hint !== undefined"
    @update:model-value="onText"
  />
</template>
