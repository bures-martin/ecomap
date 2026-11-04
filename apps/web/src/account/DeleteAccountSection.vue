<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { ref, useId } from 'vue';
import { useRouter } from 'vue-router';
import { ApiRequestError } from '../api/client.js';
import { useAuth } from '../auth/auth.js';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import { useApiErrorMessage } from '../composables/useApiErrorMessage.js';
import { useToast } from '../composables/useToast.js';

/**
 * Deleting one's own account - the right to erasure, without having to ask an
 * admin. The password proves it is really them; a checkbox decides whether the
 * places they added go too, or stay as "added by a former member".
 */
const { t } = useTranslation();
const auth = useAuth();
const router = useRouter();
const toast = useToast();
const errorMessage = useApiErrorMessage();
const headingId = useId();

const password = ref('');
const deleteContributions = ref(false);
const confirming = ref(false);
const busy = ref(false);
const error = ref<string | null>(null);

const ask = (): void => {
  error.value = null;
  if (!password.value) {
    error.value = t('deleteAccount.passwordNeeded');
    return;
  }
  confirming.value = true;
};

const remove = async (): Promise<void> => {
  confirming.value = false;
  busy.value = true;
  try {
    await auth.deleteAccount({
      password: password.value,
      deleteContributions: deleteContributions.value,
    });
    toast.showSuccess(t('deleteAccount.done'));
    await router.replace('/');
  } catch (caught) {
    /* The two answers people can expect here, in the page's own language. */
    if (caught instanceof ApiRequestError && caught.code === 'invalid_credentials') {
      error.value = t('deleteAccount.wrongPassword');
    } else if (caught instanceof ApiRequestError && caught.code === 'conflict') {
      error.value = t('deleteAccount.lastSuperadmin');
    } else {
      error.value = errorMessage(caught);
    }
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <v-card tag="section" class="pa-6" :aria-labelledby="headingId">
    <h2 :id="headingId" class="text-title-large mb-2">{{ t('deleteAccount.title') }}</h2>
    <v-divider class="mb-4" />

    <form novalidate class="d-flex flex-column ga-4" @submit.prevent="ask">
      <p class="text-body-medium">{{ t('deleteAccount.intro') }}</p>
      <v-alert v-if="error" type="error">{{ error }}</v-alert>
      <v-checkbox
        :model-value="deleteContributions"
        :label="t('deleteAccount.alsoPlaces')"
        :hint="t('deleteAccount.alsoPlacesHelp')"
        persistent-hint
        @update:model-value="(checked: boolean | null) => (deleteContributions = checked === true)"
      />
      <v-text-field
        v-model="password"
        :label="t('deleteAccount.password')"
        type="password"
        autocomplete="current-password"
        required
      />
      <div>
        <v-btn type="submit" color="error" variant="flat" :loading="busy">
          {{ t('deleteAccount.button') }}
        </v-btn>
      </div>
    </form>

    <ConfirmDialog
      :open="confirming"
      :title="t('deleteAccount.confirmTitle')"
      :body="
        deleteContributions ? t('deleteAccount.confirmWithPlaces') : t('deleteAccount.confirmKeep')
      "
      :confirm-label="t('deleteAccount.button')"
      destructive
      @confirm="remove"
      @cancel="confirming = false"
    />
  </v-card>
</template>
