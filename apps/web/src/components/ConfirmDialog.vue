<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { useId } from 'vue';

/** Confirmation before anything irreversible - deleting a feature or a layer. */
const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    body: string;
    confirmLabel?: string;
    destructive?: boolean;
  }>(),
  { destructive: false },
);

const emit = defineEmits<{ confirm: []; cancel: [] }>();

const { t } = useTranslation();
const titleId = useId();

const onOpenChange = (value: boolean): void => {
  if (!value) emit('cancel');
};
</script>

<template>
  <v-dialog
    :model-value="props.open"
    max-width="480"
    :aria-labelledby="titleId"
    @update:model-value="onOpenChange"
  >
    <v-card>
      <v-card-title :id="titleId">{{ props.title }}</v-card-title>
      <v-card-text>{{ props.body }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="emit('cancel')">{{ t('app.cancel') }}</v-btn>
        <v-btn
          variant="flat"
          :color="props.destructive ? 'error' : 'primary'"
          autofocus
          @click="emit('confirm')"
        >
          {{ props.confirmLabel ?? t('app.confirm') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
