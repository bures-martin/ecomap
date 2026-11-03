<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import ChangePasswordSection from '../account/ChangePasswordSection.vue';
import TwoFactorSection from '../account/TwoFactorSection.vue';
import { useAuth } from '../auth/auth.js';

/** Password change and two-factor setup for the signed-in user. */
const { t } = useTranslation();
const auth = useAuth();
const router = useRouter();

watchEffect(() => {
  if (!auth.isLoading && !auth.user) void router.replace('/sign-in');
});
</script>

<template>
  <v-container v-if="auth.user" class="page page-sm">
    <h1 class="text-headline-large font-weight-bold mb-4">{{ t('auth.accountTitle') }}</h1>

    <div class="d-flex flex-column ga-6">
      <v-card class="pa-6">
        <h2 class="text-title-large">{{ auth.user.displayName }}</h2>
        <p class="text-medium-emphasis">{{ auth.user.email }}</p>
        <v-chip size="small" class="mt-2">{{ t(`people.roles.${auth.user.role}`) }}</v-chip>
      </v-card>

      <TwoFactorSection :user="auth.user" />
      <ChangePasswordSection />
    </div>
  </v-container>
</template>
