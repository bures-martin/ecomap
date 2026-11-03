<script setup lang="ts">
import { mdiClose } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { computed } from 'vue';
import { useToast } from '../composables/useToast.js';

const { t } = useTranslation();
const toaster = useToast();

const toast = computed(() => toaster.current.value);

const open = computed({
  get: () => toast.value !== null,
  set: (value: boolean) => {
    if (!value) toaster.dismiss();
  },
});
</script>

<template>
  <!--
    Keyed by the toast id so a second message restarts the timeout. Errors stay
    up longer, and a click elsewhere never steals a message away.
  -->
  <v-snackbar
    :key="toast?.id ?? 0"
    v-model="open"
    :timeout="toast?.severity === 'error' ? 8000 : 4000"
    :color="toast?.severity ?? 'info'"
    location="bottom"
    role="alert"
  >
    {{ toast?.message }}
    <template #actions>
      <v-btn :icon="mdiClose" variant="text" :aria-label="t('app.close')" @click="open = false" />
    </template>
  </v-snackbar>
</template>
