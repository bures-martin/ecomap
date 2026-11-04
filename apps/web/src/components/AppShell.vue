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
import UserAvatar from './UserAvatar.vue';

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

    <!--
      A light header in light mode, a charcoal one in dark mode, with soft
      text: the "header" / "on-header" theme colours. The community's own
      colour stays as the accent on the map icon.
    -->
    <v-toolbar color="header" density="comfortable" class="px-2 app-header" tag="header">
      <v-btn
        v-if="adminLinks.length > 0 && !isDesktop"
        :icon="mdiMenu"
        :aria-label="t('nav.openMenu')"
        @click="drawerOpen = true"
      />

      <v-icon :icon="mdiMap" color="logo" aria-hidden="true" class="mx-2" />
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

      <!--
        Language switch: prepared, but hidden while the map is Danish only.
        To bring it back, import LanguageMenu from './LanguageMenu.vue', put
        <LanguageMenu /> here and set VITE_LANGUAGE_SWITCH=true (see i18n/index.ts).
      -->
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
          <v-btn v-bind="activator" variant="text" :aria-label="auth.user.displayName">
            <UserAvatar
              :name="auth.user.displayName"
              :src="auth.user.avatarUrl"
              :size="28"
              :class="{ 'mr-2': isDesktop }"
            />
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
      <!-- Admins without two-factor sign-in: their admin pages wait for it. -->
      <v-alert
        v-if="auth.needsTwoFactorSetup() && route.path !== '/account'"
        type="warning"
        variant="tonal"
        density="compact"
        rounded="0"
        class="two-factor-banner"
      >
        <span>{{ t('twoFactorRequired.banner') }}</span>
        <template #append>
          <v-btn size="small" variant="flat" color="warning" to="/account">
            {{ t('twoFactorRequired.action') }}
          </v-btn>
        </template>
      </v-alert>
      <slot />
    </main>
  </div>
</template>

<style scoped>
/* Its own height only: the page below it takes the rest. */
.two-factor-banner {
  flex: 0 0 auto;
}

.app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* A hairline instead of a coloured bar separates the header from the page. */
.app-header {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
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
  color: rgb(var(--v-theme-link));
}

.skip-link:focus {
  top: 8px;
}
</style>
