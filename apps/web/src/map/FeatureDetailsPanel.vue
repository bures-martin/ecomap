<script setup lang="ts">
import { canDeleteFeature, canEditFeature, type Feature, type Layer } from '@ecomap/shared';
import { mdiClose, mdiDelete, mdiPencil } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { computed } from 'vue';
import { useDisplay } from 'vuetify';
import { useAuth } from '../auth/auth.js';
import UserAvatar from '../components/UserAvatar.vue';
import FeatureGallery from './FeatureGallery.vue';
import { useLanguage } from '../i18n/index.js';

/**
 * Details of the selected contribution, plus the actions the viewer is allowed
 * to take. The permission helpers are the same ones the API enforces, so the
 * buttons on screen and the rules on the server cannot drift apart.
 */
const props = defineProps<{ feature: Feature | null; layer: Layer | undefined }>();
const emit = defineEmits<{
  close: [];
  edit: [feature: Feature];
  delete: [feature: Feature];
  moderate: [feature: Feature, status: 'published' | 'rejected'];
}>();

const { t } = useTranslation();
const language = useLanguage();
const auth = useAuth();
const { xs, width: viewportWidth } = useDisplay();

const actor = computed(() => (auth.user ? { id: auth.user.id, role: auth.user.role } : null));
const mayEdit = computed(() =>
  props.feature ? canEditFeature(actor.value, props.feature) : false,
);
const mayDelete = computed(() =>
  props.feature ? canDeleteFeature(actor.value, props.feature) : false,
);

const open = computed({
  get: () => props.feature !== null,
  set: (value: boolean) => {
    if (!value) emit('close');
  },
});

/** Only the layer's fields that this contribution actually filled in. */
const filledFields = computed(() => {
  const { feature, layer } = props;
  if (!feature || !layer) return [];
  return layer.fields.flatMap((field) => {
    const value = feature.properties[field.key];
    if (value === undefined || value === null || value === '') return [];
    return [{ key: field.key, label: field.label, text: formatPropertyValue(value, field.type) }];
  });
});

function formatPropertyValue(
  value: string | number | boolean,
  type: Layer['fields'][number]['type'],
): string {
  if (typeof value === 'boolean') return value ? '✓' : '—';
  if (type === 'date' && typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString(language.value);
  }
  return String(value);
}
</script>

<template>
  <!--
    The route watcher stays off: selecting a feature *is* a route change (the id
    lives in the query string), so Vuetify would otherwise close the panel the
    moment it opens.
  -->
  <v-navigation-drawer
    v-model="open"
    location="right"
    temporary
    disable-route-watcher
    :width="xs ? viewportWidth : 380"
  >
    <article v-if="props.feature" class="d-flex flex-column ga-4 pa-4">
      <div class="d-flex align-start ga-2">
        <div class="flex-grow-1">
          <h2 class="text-headline-small">{{ props.feature.name }}</h2>
          <div class="d-flex flex-wrap ga-2 mt-2">
            <v-chip v-if="props.layer" size="small" variant="flat" :color="props.layer.color">
              {{ props.layer.name }}
            </v-chip>
            <v-chip
              v-if="props.feature.status !== 'published'"
              size="small"
              :color="props.feature.status === 'rejected' ? 'error' : 'warning'"
            >
              {{ t(`feature.status.${props.feature.status}`) }}
            </v-chip>
          </div>
        </div>
        <v-btn
          :icon="mdiClose"
          variant="text"
          :aria-label="t('app.close')"
          @click="emit('close')"
        />
      </div>

      <FeatureGallery :feature="props.feature" />

      <p v-if="props.feature.description" class="pre-wrap">{{ props.feature.description }}</p>

      <template v-if="filledFields.length > 0">
        <v-divider />
        <dl class="property-list">
          <div v-for="field in filledFields" :key="field.key">
            <dt class="text-body-small text-medium-emphasis">{{ field.label }}</dt>
            <dd>{{ field.text }}</dd>
          </div>
        </dl>
      </template>

      <v-divider />

      <div class="d-flex align-center ga-2">
        <UserAvatar
          v-if="props.feature.createdByName"
          :name="props.feature.createdByName"
          :src="props.feature.createdByAvatarUrl"
          :size="28"
        />
        <p class="text-body-small text-medium-emphasis">
          {{
            props.feature.createdByName
              ? t('feature.addedBy', { name: props.feature.createdByName })
              : t('feature.addedByUnknown')
          }}
          ·
          {{
            t('feature.addedOn', {
              date: new Date(props.feature.createdAt).toLocaleDateString(language),
            })
          }}
        </p>
      </div>

      <div
        v-if="auth.can('feature:moderate') && props.feature.status === 'pending'"
        class="d-flex ga-2"
      >
        <v-btn variant="flat" color="primary" @click="emit('moderate', props.feature, 'published')">
          {{ t('moderation.approve') }}
        </v-btn>
        <v-btn variant="text" color="error" @click="emit('moderate', props.feature, 'rejected')">
          {{ t('moderation.reject') }}
        </v-btn>
      </div>

      <div v-if="mayEdit || mayDelete" class="d-flex ga-2">
        <v-btn
          v-if="mayEdit"
          variant="text"
          :prepend-icon="mdiPencil"
          @click="emit('edit', props.feature)"
        >
          {{ t('app.edit') }}
        </v-btn>
        <v-btn
          v-if="mayDelete"
          variant="text"
          color="error"
          :prepend-icon="mdiDelete"
          @click="emit('delete', props.feature)"
        >
          {{ t('app.delete') }}
        </v-btn>
      </div>
    </article>
  </v-navigation-drawer>
</template>

<style scoped>
.property-list {
  display: grid;
  gap: 8px;
  margin: 0;
}

.property-list dd {
  margin: 0;
}
</style>
