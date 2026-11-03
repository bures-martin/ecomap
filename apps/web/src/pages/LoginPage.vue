<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { computed, ref, watchEffect } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ApiRequestError } from '../api/client.js';
import { useAuth } from '../auth/auth.js';
import { useApiErrorMessage } from '../composables/useApiErrorMessage.js';
import { safeRedirectPath } from '../router.js';

const { t } = useTranslation();
const auth = useAuth();
const route = useRoute();
const router = useRouter();
const errorMessage = useApiErrorMessage();

const email = ref('');
const password = ref('');
const totpCode = ref('');
/** Revealed only once the server says this account has two-factor turned on. */
const totpRequired = ref(false);
const error = ref<string | null>(null);
const submitting = ref(false);

/** Where a route guard sent them from, so sign-in can send them back. */
const destination = computed(() => safeRedirectPath(route.query['from']));

/* Already signed in (or just became so): go where they were heading. */
watchEffect(() => {
  if (auth.user) void router.replace(destination.value);
});

const submit = async (): Promise<void> => {
  submitting.value = true;
  error.value = null;

  try {
    await auth.login({
      email: email.value,
      password: password.value,
      ...(totpCode.value ? { totpCode: totpCode.value } : {}),
    });
  } catch (caught) {
    if (caught instanceof ApiRequestError && caught.code === 'totp_required') {
      totpRequired.value = true;
    } else {
      error.value = errorMessage(caught);
    }
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <v-container class="page page-sm">
    <v-card class="pa-4 pa-sm-8">
      <h1 class="text-headline-large font-weight-bold mb-2">{{ t('auth.signInTitle') }}</h1>
      <p class="text-medium-emphasis mb-6">{{ t('auth.signInIntro') }}</p>

      <form novalidate class="d-flex flex-column ga-4" @submit.prevent="submit">
        <v-alert v-if="error" type="error">{{ error }}</v-alert>

        <v-text-field
          v-model="email"
          :label="t('auth.email')"
          type="email"
          autocomplete="email"
          required
          autofocus
        />

        <v-text-field
          v-model="password"
          :label="t('auth.password')"
          type="password"
          autocomplete="current-password"
          required
        />

        <v-text-field
          v-if="totpRequired"
          v-model="totpCode"
          :label="t('auth.totpCode')"
          :hint="t('auth.totpCodeHelp')"
          persistent-hint
          autocomplete="one-time-code"
          inputmode="numeric"
          required
          autofocus
        />

        <v-btn type="submit" color="primary" variant="flat" size="large" :loading="submitting">
          {{ t('auth.signIn') }}
        </v-btn>

        <RouterLink to="/register">{{ t('auth.needAccount') }}</RouterLink>
      </form>
    </v-card>
  </v-container>
</template>
