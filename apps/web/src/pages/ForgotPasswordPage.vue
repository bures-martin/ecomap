<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { authApi } from '../api/endpoints.js';
import { useApiErrorMessage } from '../composables/useApiErrorMessage.js';

/**
 * "I forgot my password": an address in, a reset link out. The answer is the
 * same whether or not the address has an account - that is nobody's business
 * but the account holder's.
 */
const { t } = useTranslation();
const errorMessage = useApiErrorMessage();

const email = ref('');
const sent = ref(false);
const submitting = ref(false);
const error = ref<string | null>(null);

const submit = async (): Promise<void> => {
  submitting.value = true;
  error.value = null;
  try {
    await authApi.forgotPassword(email.value);
    sent.value = true;
  } catch (caught) {
    error.value = errorMessage(caught);
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <v-container class="page page-sm">
    <v-card class="pa-4 pa-sm-8">
      <h1 class="text-headline-large font-weight-bold mb-2">{{ t('emailLinks.forgotTitle') }}</h1>

      <div v-if="sent" class="d-flex flex-column ga-4" role="status">
        <v-alert type="success" variant="tonal">
          {{ t('emailLinks.forgotSent', { email }) }}
        </v-alert>
        <p class="text-medium-emphasis">{{ t('emailLinks.checkSpam') }}</p>
        <RouterLink to="/sign-in">{{ t('emailLinks.backToSignIn') }}</RouterLink>
      </div>

      <form v-else novalidate class="d-flex flex-column ga-4" @submit.prevent="submit">
        <p class="text-medium-emphasis">{{ t('emailLinks.forgotIntro') }}</p>
        <v-alert v-if="error" type="error">{{ error }}</v-alert>
        <v-text-field
          v-model="email"
          :label="t('auth.email')"
          type="email"
          autocomplete="email"
          required
          autofocus
        />
        <v-btn type="submit" color="primary" variant="flat" size="large" :loading="submitting">
          {{ t('emailLinks.sendResetLink') }}
        </v-btn>
        <RouterLink to="/sign-in">{{ t('emailLinks.backToSignIn') }}</RouterLink>
      </form>
    </v-card>
  </v-container>
</template>
