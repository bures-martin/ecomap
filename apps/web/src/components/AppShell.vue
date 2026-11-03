<script setup lang="ts">
import { mdiAccountCircle, mdiMap, mdiMenu } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { computed, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { useCommunitySettings } from '../api/queries.js';
import { useAuth } from '../auth/auth.js';
import { useToast } from '../composables/useToast.js';
import ColorSchemeMenu from './ColorSchemeMenu.vue';
import LanguageMenu from './LanguageMenu.vue';

/**
 * The frame around every page: a skip link, a header with the community's name,
 * and the admin navigation for those who have it.
 */
defineSlots<{ default: () => unknown }>();

const { t } = useTranslation();
const { mdAndUp: isDesktop } = useDisplay();
const settingsQuery = useCommunitySettings();
const auth = useAuth();
const toast = useToast();
const route = useRoute();
const router = useRouter();

const drawerOpen = ref(false);

const adminLinks = computed(() =>
  [
    { to: '/admin/layers', label: t('nav.layers'), visible: auth.can('layer:manage') },
    { to: '/admin/moderation', label: t('nav.moderation'), visible: auth.can('feature:moderate') },
    { to: '/admin/settings', label: t('nav.settings'), visible: auth.can('settings:manage') },
    { to: '/admin/people', label: t('nav.people'), visible: auth.can('user:manage') },
  ].filter((link) => link.visible),
);

const primaryLinks = computed(() => [
  { to: '/', label: t('nav.map') },
  { to: '/about', label: t('nav.about') },
]);

const signOut = async (): Promise<void> => {
  await auth.logout();
  toast.showInfo(t('auth.signedOut'));
  await router.push('/');
};
</script>

<template>
  <div class="app-shell">
    <!-- Visible only once focused, so a keyboard user can jump past the header. -->
    <a href="#main-content" class="skip-link">{{ t('app.skipToContent') }}</a>

    <v-toolbar color="primary" density="comfortable" class="px-2" tag="header">
      <v-btn
        v-if="adminLinks.length > 0 && !isDesktop"
        :icon="mdiMenu"
        :aria-label="t('nav.openMenu')"
        @click="drawerOpen = true"
      />

      <v-icon :icon="mdiMap" aria-hidden="true" class="mx-2" />
      <RouterLink to="/" class="app-title text-title-large">
        {{ settingsQuery.data.value?.name ?? 'EcoMap' }}
      </RouterLink>

      <nav v-if="isDesktop" :aria-label="t('nav.map')" class="d-flex ga-1">
        <v-btn
          v-for="link in [...primaryLinks, ...adminLinks]"
          :key="link.to"
          :to="link.to"
          variant="text"
          :aria-current="route.path === link.to ? 'page' : undefined"
          :class="{ 'text-decoration-underline': route.path === link.to }"
        >
          {{ link.label }}
        </v-btn>
      </nav>

      <LanguageMenu />
      <ColorSchemeMenu />

      <v-btn
        v-if="!auth.user"
        to="/sign-in"
        variant="text"
        :prepend-icon="mdiAccountCircle"
        :aria-label="t('nav.signIn')"
      >
        {{ isDesktop ? t('nav.signIn') : '' }}
      </v-btn>
      <v-menu v-else>
        <template #activator="{ props: activator }">
          <v-btn
            v-bind="activator"
            variant="text"
            :prepend-icon="mdiAccountCircle"
            :aria-label="auth.user.displayName"
          >
            {{ isDesktop ? auth.user.displayName : '' }}
          </v-btn>
        </template>
        <v-list density="compact">
          <v-list-item to="/account" :title="t('nav.account')" />
          <v-list-item :title="t('nav.signOut')" @click="signOut" />
        </v-list>
      </v-menu>
    </v-toolbar>

    <v-navigation-drawer v-model="drawerOpen" temporary :width="260">
      <v-list nav>
        <v-list-item
          v-for="link in primaryLinks"
          :key="link.to"
          :to="link.to"
          :title="link.label"
          @click="drawerOpen = false"
        />
      </v-list>
      <template v-if="adminLinks.length > 0">
        <v-divider />
        <v-list nav>
          <v-list-subheader>{{ t('nav.admin') }}</v-list-subheader>
          <v-list-item
            v-for="link in adminLinks"
            :key="link.to"
            :to="link.to"
            :title="link.label"
            @click="drawerOpen = false"
          />
        </v-list>
      </template>
    </v-navigation-drawer>

    <main id="main-content" tabindex="-1" class="app-main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.app-title {
  color: inherit;
  text-decoration: none;
  flex-grow: 1;
  font-weight: 700;
}

.app-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.skip-link {
  position: absolute;
  left: 8px;
  top: -64px;
  z-index: 3000;
  padding: 8px 16px;
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-primary));
}

.skip-link:focus {
  top: 8px;
}
</style>
