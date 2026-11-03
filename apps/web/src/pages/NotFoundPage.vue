<script setup lang="ts">
import { useTranslation } from 'i18next-vue';

const { t } = useTranslation();
</script>

<template>
  <v-container class="page page-sm py-16">
    <div class="d-flex flex-column align-start ga-4">
      <h1 class="text-headline-large font-weight-bold">{{ t('app.notFoundTitle') }}</h1>
      <p class="text-medium-emphasis">{{ t('app.notFoundBody') }}</p>
      <v-btn to="/" color="primary" variant="flat">{{ t('app.backToMap') }}</v-btn>
    </div>
  </v-container>
</template>
