<script setup lang="ts">
import { PASSWORD_MIN_LENGTH, type InvitationPreview } from '@ecomap/shared';
import { useTranslation } from 'i18next-vue';
import { computed, onMounted, ref, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authApi } from '../api/endpoints.js';
import { useAuth } from '../auth/auth.js';
import { fieldIssues, useApiErrorMessage } from '../composables/useApiErrorMessage.js';
import { useToast } from '../composables/useToast.js';

/**
 * Where an invitation link lands: `/join#<token>`.
 *
 * The token rides in the fragment, which browsers never send to a server, and
 * is moved into memory and wiped from the address bar on arrival - so it does
 * not linger in history, a screenshot or a shared screen.
 */
const { t } = useTranslation();
const auth = useAuth();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const errorMessage = useApiErrorMessage();

const token = ref('');
const preview = shallowRef<InvitationPreview | null>(null);
const loadError = ref<string | null>(null);
const loading = ref(true);

const displayName = ref('');
const email = ref('');
const password = ref('');
const submitError = shallowRef<unknown>(null);
const submitting = ref(false);

const issues = computed(() => fieldIssues(submitError.value));
const messagesFor = (key: string): string[] => {
  const message = issues.value[key];
  return message ? [message] : [];
};

onMounted(async () => {
  token.value = decodeURIComponent(route.hash.replace(/^#/, ''));
  if (route.hash) {
    window.history.replaceState(window.history.state, '', route.path);
  }
  if (!token.value) {
    loadError.value = t('join.missing');
    loading.value = false;
    return;
  }

  try {
    preview.value = await authApi.previewInvitation(token.value);
    displayName.value = preview.value.label;
  } catch (error) {
    loadError.value = errorMessage(error);
  } finally {
    loading.value = false;
  }
});

const submit = async (): Promise<void> => {
  submitting.value = true;
  submitError.value = null;
  try {
    await auth.acceptInvitation({
      token: token.value,
      displayName: displayName.value,
      email: email.value,
      password: password.value,
    });
    toast.showSuccess(t('join.welcome', { name: preview.value?.communityName ?? '' }));
    await router.replace('/');
  } catch (error) {
    submitError.value = error;
  } finally {
    submitting.value = false;
  }
};

const signOutFirst = async (): Promise<void> => {
  await auth.logout();
};
</script>

<template>
  <v-container class="page page-sm">
    <v-card class="pa-4 pa-sm-8">
      <div v-if="loading" class="centered-fill">
        <v-progress-circular indeterminate color="primary" :aria-label="t('app.loading')" />
      </div>

      <template v-else-if="loadError || !preview">
        <h1 class="text-headline-large font-weight-bold mb-4">{{ t('join.invalidTitle') }}</h1>
        <v-alert type="warning">{{ loadError }}</v-alert>
      </template>

      <template v-else>
        <h1 class="text-headline-large font-weight-bold mb-2">
          {{ t('join.title', { name: preview.communityName }) }}
        </h1>
        <p class="text-medium-emphasis mb-6">
          {{ t('join.intro', { role: t(`people.roles.${preview.role}`) }) }}
        </p>

        <v-alert v-if="auth.user" type="info" class="mb-4">
          {{ t('join.signedIn', { name: auth.user.displayName }) }}
          <template #append>
            <v-btn variant="text" size="small" @click="signOutFirst">
              {{ t('nav.signOut') }}
            </v-btn>
          </template>
        </v-alert>

        <form v-else novalidate class="d-flex flex-column ga-4" @submit.prevent="submit">
          <v-alert v-if="submitError !== null" type="error">{{
            errorMessage(submitError)
          }}</v-alert>

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

          <v-btn type="submit" color="primary" variant="flat" size="large" :loading="submitting">
            {{ t('join.submit') }}
          </v-btn>
        </form>
      </template>
    </v-card>
  </v-container>
</template>
