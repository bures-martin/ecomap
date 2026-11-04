<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import ExportCard from '../admin/ExportCard.vue';
import SettingsForm from '../admin/SettingsForm.vue';
import { useCommunitySettings } from '../api/queries.js';
import QueryBoundary from '../components/QueryBoundary.vue';

/** Everything that makes one deployment of EcoMap different from another. */
const { t } = useTranslation();
const settingsQuery = useCommunitySettings();
</script>

<template>
  <v-container class="page page-md">
    <h1 class="text-headline-large font-weight-bold mb-2">{{ t('settingsAdmin.title') }}</h1>
    <p class="text-medium-emphasis mb-6">{{ t('settingsAdmin.intro') }}</p>

    <QueryBoundary :query="settingsQuery">
      <template #default="{ data: settings }">
        <SettingsForm :settings="settings" />
      </template>
    </QueryBoundary>

    <ExportCard class="mt-6" />
  </v-container>
</template>
