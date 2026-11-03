<script setup lang="ts" generic="T">
import type { UseQueryReturnType } from '@tanstack/vue-query';
import { useTranslation } from 'i18next-vue';
import { computed } from 'vue';
import { useApiErrorMessage } from '../composables/useApiErrorMessage.js';

/**
 * Renders the three states of a query once, instead of in every page.
 *
 * The default slot receives the loaded data, so nothing downstream has to
 * handle `undefined`.
 */
const props = defineProps<{ query: UseQueryReturnType<T, Error> }>();
defineSlots<{ default: (scope: { data: T }) => unknown }>();

const { t } = useTranslation();
const errorMessage = useApiErrorMessage();

type State =
  { kind: 'pending' } | { kind: 'error'; message: string } | { kind: 'success'; data: T };

const state = computed((): State => {
  const { query } = props;
  if (query.isError.value) return { kind: 'error', message: errorMessage(query.error.value) };
  /* TanStack Query v5 never resolves a query to `undefined`, so no data means still loading. */
  const data = query.data.value;
  if (data === undefined) return { kind: 'pending' };
  return { kind: 'success', data };
});
</script>

<template>
  <div v-if="state.kind === 'pending'" class="centered-fill">
    <v-progress-circular indeterminate color="primary" :aria-label="t('app.loading')" />
  </div>
  <div v-else-if="state.kind === 'error'" class="pa-6">
    <v-alert type="error">
      {{ state.message }}
      <template #append>
        <v-btn variant="text" size="small" @click="props.query.refetch()">{{
          t('app.retry')
        }}</v-btn>
      </template>
    </v-alert>
  </div>
  <slot v-else :data="state.data" />
</template>
