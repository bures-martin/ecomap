<script setup lang="ts">
import { watchEffect } from 'vue';
import { RouterView } from 'vue-router';
import { useTheme } from 'vuetify';
import { useCommunitySettings } from './api/queries.js';
import RequirePermission from './auth/RequirePermission.vue';
import AppShell from './components/AppShell.vue';
import ToastHost from './components/ToastHost.vue';
import { applyCommunityLanguage } from './i18n/index.js';
import { applyCommunityColors } from './plugins/vuetify.js';

/**
 * The theme depends on data the API owns. Until the settings arrive we use the
 * built-in defaults, which keeps the first paint instant instead of showing a
 * spinner over the whole application.
 */
const settingsQuery = useCommunitySettings();
const theme = useTheme();

watchEffect(() => {
  const settings = settingsQuery.data.value;
  if (settings) {
    applyCommunityColors(theme.themes.value, settings.primaryColor, settings.accentColor);
    applyCommunityLanguage(settings.defaultLocale);
  }
});
</script>

<template>
  <v-app>
    <AppShell>
      <RouterView v-slot="{ Component, route }">
        <RequirePermission v-if="route.meta.permission" :permission="route.meta.permission">
          <component :is="Component" />
        </RequirePermission>
        <component :is="Component" v-else />
      </RouterView>
    </AppShell>
    <ToastHost />
  </v-app>
</template>
