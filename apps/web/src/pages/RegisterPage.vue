<script setup lang="ts">
import { PASSWORD_MIN_LENGTH } from '@ecomap/shared';
import { useTranslation } from 'i18next-vue';
import { computed, ref, shallowRef, watchEffect } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useCommunitySettings } from '../api/queries.js';
import { useAuth } from '../auth/auth.js';
import { fieldIssues, useApiErrorMessage } from '../composables/useApiErrorMessage.js';

const { t } = useTranslation();
const auth = useAuth();
const router = useRouter();
const errorMessage = useApiErrorMessage();
const settingsQuery = useCommunitySettings();

const displayName = ref('');
const email = ref('');
const password = ref('');
const error = shallowRef<unknown>(null);
const submitting = ref(false);

const settings = computed(() => settingsQuery.data.value);
const issues = computed(() => fieldIssues(error.value));
const messagesFor = (key: string): string[] => {
  const message = issues.value[key];
  return message ? [message] : [];
};

watchEffect(() => {
  if (auth.user) void router.replace('/');
});

const submit = async (): Promise<void> => {
  submitting.value = true;
  error.value = null;

  try {
    await auth.register({
      displayName: displayName.value,
      email: email.value,
      password: password.value,
    });
  } catch (caught) {
    error.value = caught;
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <v-container class="page page-sm">
    <v-card class="pa-4 pa-sm-8">
      <h1 class="text-headline-large font-weight-bold mb-2">{{ t('auth.registerTitle') }}</h1>
      <p class="text-medium-emphasis mb-6">{{ t('auth.registerIntro') }}</p>

      <v-alert v-if="settings && !settings.allowPublicRegistration" type="info">
        {{ t('auth.registrationClosed') }}
      </v-alert>

      <form v-else novalidate class="d-flex flex-column ga-4" @submit.prevent="submit">
        <v-alert v-if="error !== null" type="error">{{ errorMessage(error) }}</v-alert>

        <v-text-field
          v-model="displayName"
          :label="t('auth.displayName')"
          :hint="t('auth.displayNameHelp')"
          persistent-hint
          :error-messages="messagesFor('displayName')"
          autocomplete="name"
          required
          autofocus
        />

        <v-text-field
          v-model="email"
          :label="t('auth.email')"
          type="email"
          autocomplete="email"
          :error-messages="messagesFor('email')"
          required
        />

        <v-text-field
          v-model="password"
          :label="t('auth.password')"
          type="password"
          autocomplete="new-password"
          :hint="t('auth.passwordHelp')"
          persistent-hint
          :error-messages="messagesFor('password')"
          :minlength="PASSWORD_MIN_LENGTH"
          required
        />

        <p class="text-body-small text-medium-emphasis">
          {{ t('privacy.beforeRegister') }}
          <RouterLink to="/privacy">{{ t('privacy.title') }}</RouterLink>
        </p>

        <v-btn type="submit" color="primary" variant="flat" size="large" :loading="submitting">
          {{ t('auth.register') }}
        </v-btn>

        <RouterLink to="/sign-in">{{ t('auth.haveAccount') }}</RouterLink>
      </form>
    </v-card>
  </v-container>
</template>
