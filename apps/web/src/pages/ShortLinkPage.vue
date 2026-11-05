<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { linksApi } from '../api/endpoints.js';
import { fromSearchParams } from '../map/routeQuery.js';

/**
 * A short link (`/s/k7m2qx`) - from a message or a QR code in a brochure.
 * It looks up the map view the code stands for and opens the map there,
 * replacing itself in the history so "back" does not land here again.
 */
const { t } = useTranslation();
const route = useRoute();
const router = useRouter();
const missing = ref(false);

onMounted(async () => {
  const code = String(route.params['code'] ?? '');
  try {
    const link = await linksApi.open(code);
    await router.replace({ path: '/', query: fromSearchParams(new URLSearchParams(link.query)) });
  } catch {
    missing.value = true;
  }
});
</script>

<template>
  <v-container class="page page-sm py-16">
    <div v-if="missing" class="d-flex flex-column align-start ga-4">
      <h1 class="text-headline-large font-weight-bold">{{ t('share.missingTitle') }}</h1>
      <p class="text-medium-emphasis">{{ t('share.missingBody') }}</p>
      <v-btn to="/" color="primary" variant="flat">{{ t('app.backToMap') }}</v-btn>
    </div>
    <div v-else class="d-flex justify-center" role="status" :aria-label="t('share.opening')">
      <v-progress-circular indeterminate color="primary" />
    </div>
  </v-container>
</template>
