<script setup lang="ts">
import {
  mdiAlertCircleOutline,
  mdiCheckCircleOutline,
  mdiClose,
  mdiInformationOutline,
} from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { computed } from 'vue';
import { useToast, type ToastSeverity } from '../composables/useToast.js';

const { t } = useTranslation();
const toaster = useToast();

const toast = computed(() => toaster.current.value);

const open = computed({
  get: () => toast.value !== null,
  set: (value: boolean) => {
    if (!value) toaster.dismiss();
  },
});

/* The severity shows in the icon and a thin stripe, not as a loud block of colour. */
const ICON: Readonly<Record<ToastSeverity, string>> = {
  success: mdiCheckCircleOutline,
  error: mdiAlertCircleOutline,
  info: mdiInformationOutline,
};

const severity = computed((): ToastSeverity => toast.value?.severity ?? 'info');
</script>

<template>
  <!--
    Keyed by the toast id so a second message restarts the timeout. Errors stay
    up longer, and a click elsewhere never steals a message away. A light card
    in light mode and a charcoal one in dark mode, like the header.
  -->
  <v-snackbar
    :key="toast?.id ?? 0"
    v-model="open"
    :timeout="severity === 'error' ? 8000 : 4000"
    color="header"
    location="bottom"
    role="alert"
    :class="`toast toast--${severity}`"
  >
    <span class="d-flex align-center ga-3">
      <v-icon :icon="ICON[severity]" :color="severity" aria-hidden="true" />
      <span>{{ toast?.message }}</span>
    </span>
    <template #actions>
      <v-btn
        :icon="mdiClose"
        variant="text"
        size="small"
        :aria-label="t('app.close')"
        @click="open = false"
      />
    </template>
  </v-snackbar>
</template>

<style scoped>
.toast :deep(.v-snackbar__wrapper) {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-left-width: 4px;
}

.toast--success :deep(.v-snackbar__wrapper) {
  border-left-color: rgb(var(--v-theme-success));
}

.toast--error :deep(.v-snackbar__wrapper) {
  border-left-color: rgb(var(--v-theme-error));
}

.toast--info :deep(.v-snackbar__wrapper) {
  border-left-color: rgb(var(--v-theme-info));
}
</style>
