<script setup lang="ts">
import {
  BASEMAPS,
  LOCALES,
  LOCALE_LABELS,
  updateCommunitySettingsInputSchema,
  type CommunitySettings,
} from '@ecomap/shared';
import { useTranslation } from 'i18next-vue';
import { computed, ref, useId } from 'vue';
import { useUpdateSettings } from '../api/queries.js';
import { useApiErrorMessage } from '../composables/useApiErrorMessage.js';
import { useToast } from '../composables/useToast.js';
import AreaEditor from './AreaEditor.vue';
import { toSettingsDraft } from './settingsDraft.js';

const props = defineProps<{ settings: CommunitySettings }>();

const { t } = useTranslation();
const toast = useToast();
const errorMessage = useApiErrorMessage();
const updateSettings = useUpdateSettings();
const viewHeadingId = useId();
const areaHeadingId = useId();

const draft = ref(toSettingsDraft(props.settings));
const validationError = ref<string | null>(null);

const basemapItems = computed(() =>
  BASEMAPS.map((basemap) => ({ title: t(`settingsAdmin.basemaps.${basemap}`), value: basemap })),
);
const localeItems = LOCALES.map((locale) => ({ title: LOCALE_LABELS[locale], value: locale }));

const submit = (): void => {
  validationError.value = null;
  const current = draft.value;

  const input = updateCommunitySettingsInputSchema.safeParse({
    name: current.name,
    tagline: current.tagline,
    aboutMarkdown: current.aboutMarkdown,
    primaryColor: current.primaryColor,
    accentColor: current.accentColor,
    defaultLocale: current.defaultLocale,
    basemap: current.basemap,
    initialView: {
      lat: Number(current.lat),
      lng: Number(current.lng),
      zoom: Number(current.zoom),
    },
    contributionArea: current.contributionArea,
    allowPublicRegistration: current.allowPublicRegistration,
  });

  if (!input.success) {
    validationError.value = input.error.issues[0]?.message ?? t('errors.validation_failed');
    return;
  }

  updateSettings.mutate(input.data, {
    onSuccess: () => {
      toast.showSuccess(t('settingsAdmin.saved'));
    },
    onError: (error) => {
      toast.showError(errorMessage(error));
    },
  });
};
</script>

<template>
  <form novalidate class="d-flex flex-column ga-6" @submit.prevent="submit">
    <v-alert v-if="validationError" type="error">{{ validationError }}</v-alert>

    <v-card class="pa-6 d-flex flex-column ga-4">
      <v-text-field v-model="draft.name" :label="t('settingsAdmin.name')" required />
      <v-text-field v-model="draft.tagline" :label="t('settingsAdmin.tagline')" />
      <v-textarea
        v-model="draft.aboutMarkdown"
        :label="t('settingsAdmin.about')"
        :hint="t('settingsAdmin.aboutHelp')"
        persistent-hint
        rows="4"
        auto-grow
      />
    </v-card>

    <v-card class="pa-6 d-flex flex-column ga-4">
      <div class="responsive-row">
        <v-text-field
          v-model="draft.primaryColor"
          :label="t('settingsAdmin.primaryColor')"
          type="color"
        />
        <v-text-field
          v-model="draft.accentColor"
          :label="t('settingsAdmin.accentColor')"
          type="color"
        />
      </div>
      <div class="responsive-row">
        <v-select
          v-model="draft.basemap"
          :items="basemapItems"
          :label="t('settingsAdmin.basemap')"
        />
        <v-select
          v-model="draft.defaultLocale"
          :items="localeItems"
          :label="t('settingsAdmin.defaultLocale')"
        />
      </div>
    </v-card>

    <v-card tag="section" class="pa-6" :aria-labelledby="viewHeadingId">
      <h2 :id="viewHeadingId" class="text-title-large mb-4">
        {{ t('settingsAdmin.initialView') }}
      </h2>
      <div class="responsive-row">
        <v-text-field
          v-model="draft.lat"
          :label="t('settingsAdmin.initialLat')"
          inputmode="decimal"
        />
        <v-text-field
          v-model="draft.lng"
          :label="t('settingsAdmin.initialLng')"
          inputmode="decimal"
        />
        <v-text-field
          v-model="draft.zoom"
          :label="t('settingsAdmin.initialZoom')"
          inputmode="numeric"
        />
      </div>
    </v-card>

    <v-card tag="section" class="pa-6" :aria-labelledby="areaHeadingId">
      <h2 :id="areaHeadingId" class="text-title-large mb-2">
        {{ t('settingsAdmin.area.title') }}
      </h2>
      <p class="text-body-medium text-medium-emphasis mb-4">
        {{ t('settingsAdmin.area.help') }}
      </p>

      <AreaEditor
        v-model="draft.contributionArea"
        :basemap="draft.basemap"
        :initial-view="props.settings.initialView"
        :color="draft.primaryColor"
      />
    </v-card>

    <v-card class="pa-6">
      <v-checkbox
        :model-value="draft.allowPublicRegistration"
        :label="t('settingsAdmin.allowPublicRegistration')"
        hide-details
        @update:model-value="
          (checked: boolean | null) => (draft.allowPublicRegistration = checked === true)
        "
      />
    </v-card>

    <div>
      <v-btn
        type="submit"
        color="primary"
        variant="flat"
        size="large"
        :loading="updateSettings.isPending.value"
      >
        {{ t('app.save') }}
      </v-btn>
    </div>
  </form>
</template>
