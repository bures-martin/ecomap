<script setup lang="ts">
import { LOCALES, LOCALE_LABELS, isLocale, type Locale } from '@ecomap/shared';
import { useTranslation } from 'i18next-vue';
import { computed } from 'vue';
import { useLanguage } from '../i18n/index.js';
import FlagIcon from './FlagIcon.vue';

const { t, i18next } = useTranslation();
const language = useLanguage();

const current = computed(() => (isLocale(language.value) ? language.value : 'en'));

/**
 * Each language is named in the current one ("Engelsk" in Danish), with its own
 * name underneath when that differs - so someone who cannot read the current
 * language still finds theirs.
 */
const nativeName = (locale: Locale): string =>
  t(`languages.${locale}`) === LOCALE_LABELS[locale] ? '' : LOCALE_LABELS[locale];
</script>

<template>
  <v-menu>
    <template #activator="{ props: activator }">
      <!-- The button shows the current language's flag. -->
      <v-btn
        v-bind="activator"
        icon
        :aria-label="`${t('nav.language')}: ${t(`languages.${current}`)}`"
        :title="t('nav.language')"
      >
        <FlagIcon :locale="current" />
      </v-btn>
    </template>
    <v-list density="compact">
      <v-list-item
        v-for="locale in LOCALES"
        :key="locale"
        :title="t(`languages.${locale}`)"
        :subtitle="nativeName(locale)"
        :active="locale === current"
        @click="i18next.changeLanguage(locale)"
      >
        <template #prepend>
          <FlagIcon :locale="locale" class="mr-3" />
        </template>
      </v-list-item>
    </v-list>
  </v-menu>
</template>
