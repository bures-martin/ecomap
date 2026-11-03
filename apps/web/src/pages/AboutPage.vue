<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { computed, useId } from 'vue';
import { useCommunitySettings, useLayers } from '../api/queries.js';
import LinkifiedText from '../components/LinkifiedText.vue';

const { t } = useTranslation();
const settingsQuery = useCommunitySettings();
const layersQuery = useLayers();

const settings = computed(() => settingsQuery.data.value);
const layers = computed(() => layersQuery.data.value ?? []);

const layersHeadingId = useId();
const contributeHeadingId = useId();
</script>

<template>
  <v-container class="page page-md">
    <h1 class="text-headline-large font-weight-bold mb-2">
      {{ settings?.name ?? t('about.title') }}
    </h1>

    <p v-if="settings?.tagline" class="text-title-large text-medium-emphasis mb-6">
      {{ settings.tagline }}
    </p>

    <div class="d-flex flex-column ga-6">
      <!--
        Rendered as text with only its web addresses made into links, never parsed as HTML: the content is
        admin-authored, but rendering arbitrary markup would be a stored XSS
        waiting to happen the first time an account is compromised.
      -->
      <v-card v-if="settings?.aboutMarkdown" class="pa-6">
        <LinkifiedText :text="settings.aboutMarkdown" />
      </v-card>

      <v-card
        v-if="layers.length > 0"
        tag="section"
        class="pa-6"
        :aria-labelledby="layersHeadingId"
      >
        <h2 :id="layersHeadingId" class="text-title-large mb-3">{{ t('map.layersHeading') }}</h2>
        <div class="d-flex flex-wrap ga-2">
          <v-chip v-for="layer in layers" :key="layer.id" variant="flat" :color="layer.color">
            {{ `${layer.name} (${String(layer.featureCount)})` }}
          </v-chip>
        </div>
      </v-card>

      <v-card tag="section" class="pa-6" :aria-labelledby="contributeHeadingId">
        <h2 :id="contributeHeadingId" class="text-title-large mb-3">
          {{ t('about.contributeHeading') }}
        </h2>
        <p>{{ t('about.contributeBody') }}</p>

        <v-divider class="my-6" />

        <h2 class="text-title-large mb-3">{{ t('about.openDataHeading') }}</h2>
        <p>{{ t('about.openDataBody') }}</p>

        <p class="text-body-small text-medium-emphasis mt-4">{{ t('map.attribution') }}</p>
      </v-card>
    </div>
  </v-container>
</template>
