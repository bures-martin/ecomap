<script setup lang="ts">
import { LOCALES, LOCALE_LABELS, isLocale } from '@ecomap/shared';
import { mdiTranslate } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { computed } from 'vue';
import { useLanguage } from '../i18n/index.js';

const { t, i18next } = useTranslation();
const language = useLanguage();

const current = computed(() => (isLocale(language.value) ? language.value : 'en'));
</script>

<template>
  <v-menu>
    <template #activator="{ props: activator }">
      <v-btn
        v-bind="activator"
        :icon="mdiTranslate"
        :aria-label="`${t('nav.language')}: ${LOCALE_LABELS[current]}`"
        :title="t('nav.language')"
      />
    </template>
    <v-list density="compact">
      <v-list-item
        v-for="locale in LOCALES"
        :key="locale"
        :lang="locale"
        :title="LOCALE_LABELS[locale]"
        :active="locale === current"
        @click="i18next.changeLanguage(locale)"
      />
    </v-list>
  </v-menu>
</template>
