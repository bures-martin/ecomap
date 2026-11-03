<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { ref, useId } from 'vue';
import { useRouter } from 'vue-router';
import { authApi } from '../api/endpoints.js';
import { useAuth } from '../auth/auth.js';
import { useApiErrorMessage } from '../composables/useApiErrorMessage.js';
import { useToast } from '../composables/useToast.js';

const { t } = useTranslation();
const auth = useAuth();
const toast = useToast();
const router = useRouter();
const errorMessage = useApiErrorMessage();
const headingId = useId();

const currentPassword = ref('');
const newPassword = ref('');
const busy = ref(false);

const submit = async (): Promise<void> => {
  busy.value = true;
  try {
    await authApi.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    });
    toast.showSuccess(t('auth.passwordChanged'));
    /* Every session was revoked server-side, so this one has to end too. */
    await auth.logout();
    await router.push('/sign-in');
  } catch (error) {
    toast.showError(errorMessage(error));
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <v-card tag="section" class="pa-6" :aria-labelledby="headingId">
    <h2 :id="headingId" class="text-title-large mb-2">{{ t('auth.changePassword') }}</h2>
    <v-divider class="mb-4" />

    <form novalidate class="d-flex flex-column ga-4" @submit.prevent="submit">
      <v-text-field
        v-model="currentPassword"
        :label="t('auth.currentPassword')"
        type="password"
        autocomplete="current-password"
        required
      />
      <v-text-field
        v-model="newPassword"
        :label="t('auth.newPassword')"
        type="password"
        autocomplete="new-password"
        :hint="t('auth.passwordHelp')"
        persistent-hint
        required
      />
      <div>
        <v-btn type="submit" color="primary" variant="flat" :loading="busy">{{
          t('app.save')
        }}</v-btn>
      </div>
    </form>
  </v-card>
</template>
