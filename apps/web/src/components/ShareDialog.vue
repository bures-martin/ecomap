<script setup lang="ts">
import { shareableQuery } from '@ecomap/shared';
import { mdiClose, mdiContentCopy, mdiDownload, mdiShareVariant } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { computed, ref, useId, watch } from 'vue';
import { linksApi } from '../api/endpoints.js';
import { useToast } from '../composables/useToast.js';

/**
 * Sharing a place or the map as it is filtered now: a short link to copy or
 * hand to the phone's share sheet, and a QR code to print.
 *
 * The short link is made when the dialog opens, so the share button below is
 * pressed straight away - phones only open their share sheet from a tap, not
 * after waiting on the network. If the link cannot be made, the long address
 * works just as well.
 */
const props = defineProps<{
  open: boolean;
  /** The dialog heading, e.g. "Del Hammersly". */
  heading: string;
  /** What is shared, for the phone's share sheet, e.g. the place's name. */
  title: string;
  /** The map's query string to share - only the shareable part is kept. */
  query: string;
}>();
const emit = defineEmits<{ close: [] }>();

const { t } = useTranslation();
const toast = useToast();
const titleId = useId();

const url = ref<string | null>(null);
const qrSvg = ref<string | null>(null);
const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

const longUrl = computed(() => {
  const query = shareableQuery(new URLSearchParams(props.query));
  return `${window.location.origin}/${query ? `?${query}` : ''}`;
});

watch(
  () => [props.open, props.query] as const,
  async ([open, query], _previous, onCleanup) => {
    url.value = null;
    qrSvg.value = null;
    if (!open) return;
    /* Read through a function: the cleanup flips it while we await. */
    let cancelled = false;
    const stale = (): boolean => cancelled;
    onCleanup(() => {
      cancelled = true;
    });

    let shared = longUrl.value;
    try {
      const link = await linksApi.create(query);
      shared = `${window.location.origin}/s/${link.code}`;
    } catch {
      /* Keep the long address. */
    }
    if (stale()) return;
    url.value = shared;

    /* Only people who share load the QR library. SVG, so it prints sharp at any size. */
    const { default: QRCode } = await import('qrcode');
    const svg = await QRCode.toString(shared, { type: 'svg', margin: 2 });
    if (!stale()) qrSvg.value = svg;
  },
  { immediate: true },
);

const qrImage = computed(() =>
  qrSvg.value ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg.value)}` : null,
);
/* Named after the short code ("qr-k7m2qx.svg"), so a printer can tell two codes apart. */
const qrFileName = computed(() => {
  const code = url.value?.match(/\/s\/([a-z0-9]+)$/)?.[1];
  return code ? `qr-${code}.svg` : 'qr-kort.svg';
});

async function copy(): Promise<void> {
  if (!url.value) return;
  try {
    await navigator.clipboard.writeText(url.value);
    toast.showSuccess(t('share.copied'));
  } catch {
    toast.showError(t('share.copyFailed'));
  }
}

async function shareVia(): Promise<void> {
  if (!url.value) return;
  try {
    await navigator.share({ title: props.title, url: url.value });
  } catch {
    /* Closing the share sheet without choosing anything is not an error. */
  }
}
</script>

<template>
  <v-dialog
    :model-value="props.open"
    max-width="420"
    :aria-labelledby="titleId"
    @update:model-value="(value: boolean) => !value && emit('close')"
  >
    <v-card>
      <div class="d-flex align-center pr-2">
        <v-card-title :id="titleId" class="flex-grow-1 text-wrap">
          {{ props.heading }}
        </v-card-title>
        <v-btn
          :icon="mdiClose"
          variant="text"
          :aria-label="t('app.close')"
          @click="emit('close')"
        />
      </div>

      <v-card-text class="d-flex flex-column ga-4">
        <v-text-field
          :model-value="url ?? ''"
          :label="t('share.link')"
          :loading="url === null"
          readonly
          hide-details
          @focus="($event.target as HTMLInputElement).select()"
        />

        <div class="d-flex flex-wrap ga-2">
          <v-btn
            color="primary"
            variant="flat"
            :prepend-icon="mdiContentCopy"
            :disabled="url === null"
            @click="copy"
          >
            {{ t('share.copy') }}
          </v-btn>
          <v-btn
            v-if="canShare"
            color="primary"
            variant="tonal"
            :prepend-icon="mdiShareVariant"
            :disabled="url === null"
            @click="shareVia"
          >
            {{ t('share.shareVia') }}
          </v-btn>
        </div>

        <div class="d-flex flex-column align-center ga-2">
          <!-- Always dark on white: a QR code must keep its contrast to scan. -->
          <div class="qr">
            <img v-if="qrImage" :src="qrImage" :alt="t('share.qrAlt')" width="200" height="200" />
            <v-progress-circular v-else indeterminate color="primary" />
          </div>
          <v-btn
            :href="qrImage ?? undefined"
            :download="qrFileName"
            :disabled="qrImage === null"
            variant="text"
            color="link"
            :prepend-icon="mdiDownload"
          >
            {{ t('share.downloadQr') }}
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.qr {
  display: grid;
  place-items: center;
  width: 216px;
  height: 216px;
  padding: 8px;
  border-radius: 8px;
  background: #fff;
}
</style>
