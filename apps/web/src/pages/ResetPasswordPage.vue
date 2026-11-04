<script setup lang="ts">
import { PASSWORD_MIN_LENGTH } from '@ecomap/shared';
import { useTranslation } from 'i18next-vue';
import { computed, ref, shallowRef } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { authApi } from '../api/endpoints.js';
import { fieldIssues, useApiErrorMessage } from '../composables/useApiErrorMessage.js';
import { useLinkToken } from '../composables/useLinkToken.js';
import { useToast } from '../composables/useToast.js';

/** Where the reset link lands: choose a new password, then sign in with it. */
const { t } = useTranslation();
const router = useRouter();
const toast = useToast();
const errorMessage = useApiErrorMessage();
const { token } = useLinkToken();

const password = ref('');
const submitting = ref(false);
const error = shallowRef<unknown>(null);

const issues = computed(() => fieldIssues(error.value));
const passwordMessages = computed(() => {
  const message = issues.value['newPassword'];
  return message ? [message] : [];
});

const submit = async (): Promise<void> => {
  submitting.value = true;
  error.value = null;
  try {
    await authApi.resetPassword({ token: token.value, newPassword: password.value });
    toast.showSuccess(t('emailLinks.resetDone'));
    await router.replace('/sign-in');
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
      <h1 class="text-headline-large font-weight-bold mb-2">{{ t('emailLinks.resetTitle') }}</h1>

      <form novalidate class="d-flex flex-column ga-4" @submit.prevent="submit">
        <p class="text-medium-emphasis">{{ t('emailLinks.resetIntro') }}</p>
        <v-alert v-if="error && !passwordMessages.length" type="error">
          {{ errorMessage(error) }}
          <RouterLink to="/forgot-password">{{ t('emailLinks.askAgain') }}</RouterLink>
        </v-alert>
        <v-text-field
          v-model="password"
          :label="t('auth.newPassword')"
          type="password"
          autocomplete="new-password"
          :hint="t('auth.passwordHelp')"
          persistent-hint
          :error-messages="passwordMessages"
          :minlength="PASSWORD_MIN_LENGTH"
          required
          autofocus
        />
        <v-btn type="submit" color="primary" variant="flat" size="large" :loading="submitting">
          {{ t('emailLinks.saveNewPassword') }}
        </v-btn>
      </form>
    </v-card>
  </v-container>
</template>
