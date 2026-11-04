<script setup lang="ts">
import { mdiDownload } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { ref } from 'vue';
import { apiBlob } from '../api/client.js';
import { useApiErrorMessage } from '../composables/useApiErrorMessage.js';
import { useToast } from '../composables/useToast.js';

/**
 * Everything on the map as a file: GeoJSON for map tools, CSV for
 * spreadsheets - pending places and hidden layers included. What the partner
 * agreement promises ("export your content at any time"), one click away.
 */
const { t } = useTranslation();
const toast = useToast();
const errorMessage = useApiErrorMessage();

type Format = 'geojson' | 'csv';
const busy = ref<Format | null>(null);

const download = async (format: Format): Promise<void> => {
  busy.value = format;
  try {
    const blob = await apiBlob(`/api/export?format=${format}`);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ecomap-${new Date().toISOString().slice(0, 10)}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    toast.showError(errorMessage(error));
  } finally {
    busy.value = null;
  }
};
</script>

<template>
  <v-card class="pa-6 d-flex flex-column ga-3">
    <h2 class="text-title-large">{{ t('exportData.title') }}</h2>
    <p class="text-body-medium text-medium-emphasis">{{ t('exportData.intro') }}</p>
    <div class="d-flex flex-wrap ga-2">
      <v-btn
        variant="tonal"
        color="primary"
        :prepend-icon="mdiDownload"
        :loading="busy === 'geojson'"
        :disabled="busy !== null"
        @click="download('geojson')"
      >
        {{ t('exportData.geojson') }}
      </v-btn>
      <v-btn
        variant="tonal"
        color="primary"
        :prepend-icon="mdiDownload"
        :loading="busy === 'csv'"
        :disabled="busy !== null"
        @click="download('csv')"
      >
        {{ t('exportData.csv') }}
      </v-btn>
    </div>
  </v-card>
</template>
