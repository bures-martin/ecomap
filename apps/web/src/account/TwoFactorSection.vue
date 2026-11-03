<script setup lang="ts">
import type { CurrentUser } from '@ecomap/shared';
import { useTranslation } from 'i18next-vue';
import QRCode from 'qrcode';
import { ref, useId, watch } from 'vue';
import { authApi } from '../api/endpoints.js';
import { useAuth } from '../auth/auth.js';
import { useApiErrorMessage } from '../composables/useApiErrorMessage.js';
import { useToast } from '../composables/useToast.js';

const props = defineProps<{ user: CurrentUser }>();

const { t } = useTranslation();
const auth = useAuth();
const toast = useToast();
const errorMessage = useApiErrorMessage();
const headingId = useId();

const setupUri = ref<string | null>(null);
const secret = ref<string | null>(null);
const qrDataUrl = ref<string | null>(null);
const code = ref('');
const password = ref('');
const busy = ref(false);

/* Render the otpauth URI as a QR code the authenticator app can scan. */
watch(setupUri, (uri, _previous, onCleanup) => {
  qrDataUrl.value = null;
  if (!uri) return;
  let cancelled = false;
  onCleanup(() => {
    cancelled = true;
  });
  void QRCode.toDataURL(uri, { margin: 1, width: 220 }).then((url) => {
    if (!cancelled) qrDataUrl.value = url;
  });
});

/** Runs one request with the busy flag set, reporting any failure as a toast. */
const run = async (action: () => Promise<void>): Promise<void> => {
  busy.value = true;
  try {
    await action();
  } catch (error) {
    toast.showError(errorMessage(error));
  } finally {
    busy.value = false;
  }
};

const startSetup = () =>
  run(async () => {
    const setup = await authApi.startTotpSetup();
    setupUri.value = setup.uri;
    secret.value = setup.secret;
  });

const confirmSetup = () =>
  run(async () => {
    await authApi.enableTotp(code.value);
    await auth.reloadUser();
    setupUri.value = null;
    secret.value = null;
    code.value = '';
    toast.showSuccess(t('auth.twoFactorEnabled'));
  });

const disable = () =>
  run(async () => {
    await authApi.disableTotp(password.value);
    await auth.reloadUser();
    password.value = '';
    toast.showInfo(t('auth.twoFactorDisabled'));
  });
</script>

<template>
  <v-card tag="section" class="pa-6" :aria-labelledby="headingId">
    <div class="d-flex flex-column ga-4">
      <div class="d-flex align-center ga-2">
        <h2 :id="headingId" class="text-title-large flex-grow-1">{{ t('auth.twoFactorTitle') }}</h2>
        <v-chip size="small" :color="props.user.totpEnabled ? 'success' : undefined">
          {{ props.user.totpEnabled ? t('auth.twoFactorOn') : t('auth.twoFactorOff') }}
        </v-chip>
      </div>

      <p class="text-medium-emphasis">{{ t('auth.twoFactorIntro') }}</p>

      <form v-if="props.user.totpEnabled" class="d-flex flex-column ga-4" @submit.prevent="disable">
        <v-text-field
          v-model="password"
          :label="t('auth.password')"
          type="password"
          autocomplete="current-password"
          required
        />
        <div>
          <v-btn type="submit" color="error" variant="text" :loading="busy">
            {{ t('auth.twoFactorDisable') }}
          </v-btn>
        </div>
      </form>

      <form v-else-if="setupUri" class="d-flex flex-column ga-4" @submit.prevent="confirmSetup">
        <p class="text-title-small">{{ t('auth.twoFactorSetupStep1') }}</p>
        <img v-if="qrDataUrl" :src="qrDataUrl" :alt="t('auth.twoFactorQrAlt')" class="qr-code" />

        <v-alert type="info" :icon="false" variant="tonal">
          <span class="d-block text-body-small">{{ t('auth.twoFactorManualEntry') }}</span>
          <span class="secret">{{ secret }}</span>
        </v-alert>

        <p class="text-title-small">{{ t('auth.twoFactorSetupStep2') }}</p>
        <v-text-field
          v-model="code"
          :label="t('auth.totpCode')"
          inputmode="numeric"
          autocomplete="one-time-code"
          required
        />
        <div>
          <v-btn type="submit" color="primary" variant="flat" :loading="busy">
            {{ t('auth.twoFactorEnable') }}
          </v-btn>
        </div>
      </form>

      <div v-else>
        <v-btn variant="outlined" color="primary" :loading="busy" @click="startSetup">
          {{ t('auth.twoFactorEnable') }}
        </v-btn>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.qr-code {
  width: 220px;
  height: 220px;
  align-self: flex-start;
  background: #fff;
  padding: 8px;
}

.secret {
  font-family: monospace;
  word-break: break-all;
}
</style>
