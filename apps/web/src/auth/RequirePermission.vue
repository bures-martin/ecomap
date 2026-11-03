<script setup lang="ts">
import type { Permission } from '@ecomap/shared';
import { useTranslation } from 'i18next-vue';
import { watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from './auth.js';

/**
 * Route guard. Note this is convenience, not security: the API enforces the same
 * permission on every request, so a hand-typed URL gains nothing.
 */
const props = defineProps<{ permission: Permission }>();
defineSlots<{ default: () => unknown }>();

const { t } = useTranslation();
const auth = useAuth();
const route = useRoute();
const router = useRouter();

watchEffect(() => {
  if (!auth.isLoading && !auth.user) {
    /* Remember where they were going, so sign-in can send them back. */
    void router.replace({ path: '/sign-in', query: { from: route.fullPath } });
  }
});
</script>

<template>
  <div v-if="auth.isLoading" class="centered-fill">
    <v-progress-circular indeterminate color="primary" :aria-label="t('app.loading')" />
  </div>
  <div v-else-if="auth.user && !auth.can(props.permission)" class="pa-6">
    <v-alert type="error">{{ t('errors.forbidden') }}</v-alert>
  </div>
  <slot v-else-if="auth.user" />
</template>
