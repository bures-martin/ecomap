<script setup lang="ts">
import { mdiBrightness4, mdiBrightness7, mdiBrightnessAuto } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { computed } from 'vue';
import { useColorScheme, type ColorScheme } from '../composables/useColorScheme.js';

const { t } = useTranslation();
const { mode, setMode } = useColorScheme();

const options = computed((): { value: ColorScheme; label: string; icon: string }[] => [
  { value: 'light', label: t('nav.themeLight'), icon: mdiBrightness7 },
  { value: 'dark', label: t('nav.themeDark'), icon: mdiBrightness4 },
  { value: 'system', label: t('nav.themeSystem'), icon: mdiBrightnessAuto },
]);

const currentIcon = computed(
  () => options.value.find((option) => option.value === mode.value)?.icon ?? mdiBrightnessAuto,
);
</script>

<template>
  <v-menu>
    <template #activator="{ props: activator }">
      <v-btn
        v-bind="activator"
        :icon="currentIcon"
        :aria-label="t('nav.theme')"
        :title="t('nav.theme')"
      />
    </template>
    <v-list density="compact">
      <v-list-item
        v-for="option in options"
        :key="option.value"
        :prepend-icon="option.icon"
        :title="option.label"
        :active="option.value === mode"
        @click="setMode(option.value)"
      />
    </v-list>
  </v-menu>
</template>
