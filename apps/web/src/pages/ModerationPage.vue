<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { useFeatures, useModerateFeature } from '../api/queries.js';
import LinkifiedText from '../components/LinkifiedText.vue';
import QueryBoundary from '../components/QueryBoundary.vue';
import FeatureGallery from '../map/FeatureGallery.vue';
import { useApiErrorMessage } from '../composables/useApiErrorMessage.js';
import { useToast } from '../composables/useToast.js';

/** The review queue for layers that hold contributions before publishing. */
const { t } = useTranslation();
const toast = useToast();
const errorMessage = useApiErrorMessage();
const moderate = useModerateFeature();

const pendingQuery = useFeatures({ layers: [], q: '', status: 'pending', mine: false });

const decide = (id: string, status: 'published' | 'rejected'): void => {
  moderate.mutate(
    { id, input: { status } },
    {
      onSuccess: () => {
        toast.showSuccess(
          status === 'published' ? t('moderation.approved') : t('moderation.rejected'),
        );
      },
      onError: (error) => {
        toast.showError(errorMessage(error));
      },
    },
  );
};
</script>

<template>
  <v-container class="page page-md">
    <h1 class="text-headline-large font-weight-bold mb-2">{{ t('moderation.title') }}</h1>
    <p class="text-medium-emphasis mb-6">{{ t('moderation.intro') }}</p>

    <QueryBoundary :query="pendingQuery">
      <template #default="{ data: { features } }">
        <v-alert v-if="features.length === 0" type="success">{{ t('moderation.empty') }}</v-alert>
        <div v-else class="d-flex flex-column ga-4">
          <v-card v-for="feature in features" :key="feature.id" tag="article" class="pa-4">
            <div class="d-flex flex-column ga-2">
              <div class="d-flex flex-wrap align-center ga-2">
                <h2 class="text-title-large flex-grow-1">{{ feature.name }}</h2>
                <v-chip size="small">{{ feature.layerSlug }}</v-chip>
              </div>

              <LinkifiedText v-if="feature.description" :text="feature.description" />

              <FeatureGallery :feature="feature" class="moderation-gallery" />

              <p class="text-body-small text-medium-emphasis">
                {{
                  feature.createdByName
                    ? t('feature.addedBy', { name: feature.createdByName })
                    : t('feature.addedByUnknown')
                }}
              </p>

              <div class="d-flex ga-2">
                <v-btn color="primary" variant="flat" @click="decide(feature.id, 'published')">
                  {{ t('moderation.approve') }}
                </v-btn>
                <v-btn color="error" variant="text" @click="decide(feature.id, 'rejected')">
                  {{ t('moderation.reject') }}
                </v-btn>
                <v-spacer />
                <v-btn variant="text" :to="{ path: '/', query: { feature: feature.id } }">
                  {{ t('nav.map') }}
                </v-btn>
              </div>
            </div>
          </v-card>
        </div>
      </template>
    </QueryBoundary>
  </v-container>
</template>

<style scoped>
.moderation-gallery {
  max-width: 480px;
}
</style>
