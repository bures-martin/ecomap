<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { computed } from 'vue';
import { useCommunitySettings } from '../api/queries.js';
import { useAuth } from '../auth/auth.js';
import SimpleMarkdown from '../components/SimpleMarkdown.vue';
import { FILL_IN_MARKER, privacyTemplate } from './privacyTemplate.js';

/**
 * The community's privacy notice: the text an admin wrote in the settings, or
 * the built-in template until they have. Admins are told when parts are still
 * waiting to be filled in, so it is not published half done by accident.
 */
const { t } = useTranslation();
const auth = useAuth();
const settingsQuery = useCommunitySettings();

const settings = computed(() => settingsQuery.data.value);
const text = computed(() => {
  const written = settings.value?.privacyMarkdown.trim() ?? '';
  return written || privacyTemplate(settings.value?.name ?? 'EcoMap');
});
const unfinished = computed(
  () => auth.can('settings:manage') && text.value.includes(FILL_IN_MARKER),
);
</script>

<template>
  <v-container class="page page-md">
    <h1 class="text-headline-large font-weight-bold mb-6">{{ t('privacy.title') }}</h1>

    <v-alert v-if="unfinished" type="warning" variant="tonal" class="mb-6">
      {{ t('privacy.unfinished') }}
      <RouterLink to="/admin/settings">{{ t('nav.settings') }}</RouterLink>
    </v-alert>

    <v-card class="pa-6">
      <SimpleMarkdown :source="text" />
    </v-card>
  </v-container>
</template>
