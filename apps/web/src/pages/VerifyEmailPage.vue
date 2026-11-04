<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAuth } from '../auth/auth.js';
import { useLinkToken } from '../composables/useLinkToken.js';
import { useToast } from '../composables/useToast.js';

/**
 * Where the link in the sign-up e-mail lands. It confirms the address, signs
 * the person in and takes them to the map; an old or used link explains what
 * to do instead.
 */
const { t } = useTranslation();
const auth = useAuth();
const router = useRouter();
const toast = useToast();
const { token, checked } = useLinkToken();

const state = ref<'working' | 'failed'>('working');

/* Once the link has been read: confirm with its token, or explain there is none. */
watch([checked, token], async ([isChecked, value]) => {
  if (!isChecked) return;
  if (!value) {
    state.value = 'failed';
    return;
  }
  state.value = 'working';
  try {
    await auth.verifyEmail(value);
    toast.showSuccess(t('emailLinks.verified'));
    await router.replace('/');
  } catch {
    state.value = 'failed';
  }
});
</script>

<template>
  <v-container class="page page-sm">
    <v-card class="pa-4 pa-sm-8">
      <h1 class="text-headline-large font-weight-bold mb-4">{{ t('emailLinks.verifyTitle') }}</h1>
      <p v-if="state === 'working'" aria-live="polite">
        <v-progress-circular indeterminate size="20" class="mr-2" aria-hidden="true" />
        {{ t('emailLinks.verifying') }}
      </p>
      <template v-else>
        <v-alert type="warning" variant="tonal" class="mb-4">
          {{ t('emailLinks.linkInvalid') }}
        </v-alert>
        <p>
          {{ t('emailLinks.verifyFailedHelp') }}
          <RouterLink to="/sign-in">{{ t('auth.signIn') }}</RouterLink>
        </p>
      </template>
    </v-card>
  </v-container>
</template>
