<script setup lang="ts">
import { TranslationComponent, useTranslation } from 'i18next-vue';
import { computed, useId } from 'vue';
import { useCommunitySettings, useLayers } from '../api/queries.js';
import SimpleMarkdown from '../components/SimpleMarkdown.vue';
import { layerIconPath } from '../map/layerIcons.js';

const { t } = useTranslation();
const settingsQuery = useCommunitySettings();
const layersQuery = useLayers();

const settings = computed(() => settingsQuery.data.value);
const layers = computed(() => layersQuery.data.value ?? []);

const whyHeadingId = useId();
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
      <!-- Why this map: the same for every community, in the reader's language. -->
      <v-card tag="section" class="pa-6" :aria-labelledby="whyHeadingId">
        <h2 :id="whyHeadingId" class="text-title-large mb-3">{{ t('about.whyHeading') }}</h2>
        <p class="mb-3">{{ t('about.whyBody') }}</p>
        <ul class="why-list">
          <li>{{ t('about.whyLocal') }}</li>
          <li>{{ t('about.whyRepair') }}</li>
          <li>{{ t('about.whyMove') }}</li>
          <li>{{ t('about.whyShare') }}</li>
        </ul>
        <p class="mt-3">{{ t('about.whyClose') }}</p>
      </v-card>

      <!--
        The community's own text from Settings, with headings, lists and links.
        Rendered as elements, never parsed as HTML: the content is admin-authored,
        but arbitrary markup would be a stored XSS waiting to happen the first
        time an account is compromised.
      -->
      <v-card v-if="settings?.aboutMarkdown" class="pa-6">
        <SimpleMarkdown :source="settings.aboutMarkdown" />
      </v-card>

      <v-card
        v-if="layers.length > 0"
        tag="section"
        class="pa-6"
        :aria-labelledby="layersHeadingId"
      >
        <h2 :id="layersHeadingId" class="text-title-large mb-3">{{ t('map.layersHeading') }}</h2>
        <!-- The same chips as over the map; each opens the map on that topic. -->
        <div class="d-flex flex-wrap ga-2">
          <RouterLink
            v-for="layer in layers"
            :key="layer.id"
            class="topic-chip"
            :style="{ '--topic-color': layer.color }"
            :to="{ path: '/', query: { layers: layer.slug } }"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
              <path :d="layerIconPath(layer.icon)" fill="currentColor" />
            </svg>
            <span>{{ layer.name }}</span>
            <span class="topic-count">{{ layer.featureCount }}</span>
          </RouterLink>
        </div>
      </v-card>

      <v-card tag="section" class="pa-6" :aria-labelledby="contributeHeadingId">
        <h2 :id="contributeHeadingId" class="text-title-large mb-3">
          {{ t('about.contributeHeading') }}
        </h2>
        <p>{{ t('about.contributeBody') }}</p>

        <v-divider class="my-6" />

        <!--
          OpenStreetMap's licence (ODbL) asks for a visible credit that links to
          its copyright page; this is that credit, with the why and the how-to-fix.
        -->
        <h2 class="text-title-large mb-3">{{ t('about.openDataHeading') }}</h2>
        <div class="open-data d-flex flex-column ga-3">
          <p>
            <TranslationComponent :translation="t('about.openDataPlaces')">
              <template #osm>
                <a href="https://www.openstreetmap.org" target="_blank" rel="noopener"
                  >OpenStreetMap</a
                >
              </template>
              <template #licence>
                <a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noopener"
                  >Open Database License (ODbL)</a
                >
              </template>
            </TranslationComponent>
          </p>
          <p>{{ t('about.openDataFix') }}</p>
          <p>{{ t('about.openDataTiles') }}</p>
        </div>

        <p class="open-data text-body-small text-medium-emphasis mt-4">
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">{{
            t('map.attribution')
          }}</a>
        </p>
        <p class="open-data text-body-small mt-2">
          <RouterLink to="/privacy">{{ t('privacy.title') }}</RouterLink>
        </p>
      </v-card>
    </div>
  </v-container>
</template>

<style scoped>
/* How many places the topic holds, as a small badge inside the chip. */
.topic-count {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 10px;
  background: rgba(var(--v-theme-on-header), 0.08);
}

.why-list {
  padding-left: 1.4em;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Links in the app's own link colour, readable in light and dark mode. */
.open-data a {
  color: rgb(var(--v-theme-link));
}

.open-data p {
  margin: 0;
}
</style>
