<script setup lang="ts">
import {
  canDeleteFeature,
  canEditFeature,
  canSuggestEdit,
  editIsSuggestion,
  type Feature,
  type Layer,
} from '@ecomap/shared';
import {
  mdiClose,
  mdiCursorMove,
  mdiDelete,
  mdiGoogleMaps,
  mdiNavigationVariant,
  mdiPencil,
  mdiShareVariant,
} from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue';
import { useDisplay } from 'vuetify';
import { useAuth } from '../auth/auth.js';
import LinkifiedText from '../components/LinkifiedText.vue';
import ShareDialog from '../components/ShareDialog.vue';
import UserAvatar from '../components/UserAvatar.vue';
import FeatureGallery from './FeatureGallery.vue';
import LayerIcon from './LayerIcon.vue';
import OpeningHoursView from './OpeningHoursView.vue';
import { googleMapsDirectionsUrl, googleMapsPlaceUrl, navigationTarget } from './navigation.js';
import { placeLinks } from './placeLinks.js';
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
  move: [feature: Feature];
  delete: [feature: Feature];
  moderate: [feature: Feature, status: 'published' | 'rejected'];
}>();

const { t } = useTranslation();
const language = useLanguage();
const auth = useAuth();
const { xs, width: viewportWidth } = useDisplay();
const linksHeadingId = useId();
const sharing = ref(false);

/* A different place closes the share dialog of the one before. */
watch(
  () => props.feature?.id,
  () => {
    sharing.value = false;
  },
);

const actor = computed(() => (auth.user ? { id: auth.user.id, role: auth.user.role } : null));
const mayEdit = computed(() =>
  props.feature ? canEditFeature(actor.value, props.feature) : false,
);
/**
 * Members who cannot edit a place directly can suggest a change to it; so do
 * authors whose own place needs review again. The button says which it is.
 */
const mayChange = computed(() =>
  props.feature ? mayEdit.value || canSuggestEdit(actor.value, props.feature) : false,
);
const changeIsSuggestion = computed(() =>
  props.feature && props.layer ? editIsSuggestion(actor.value, props.layer, props.feature) : false,
);
const mayDelete = computed(() =>
  props.feature ? canDeleteFeature(actor.value, props.feature) : false,
);

const navigationUrl = computed(() =>
  props.feature ? googleMapsDirectionsUrl(navigationTarget(props.feature.geometry)) : null,
);

const googleMapsUrl = computed(() =>
  props.feature
    ? googleMapsPlaceUrl(props.feature.name, navigationTarget(props.feature.geometry))
    : null,
);

/** Website, Facebook, Tripadvisor and co. - shown as buttons, not in the field list. */
const links = computed(() =>
  props.feature && props.layer ? placeLinks(props.feature, props.layer) : [],
);

const open = computed({
  get: () => props.feature !== null,
  set: (value: boolean) => {
    if (!value) emit('close');
  },
});

/*
 * Opening a place moves focus to its name, so a keyboard or screen-reader user
 * lands in the details instead of being left behind on the map; Escape closes
 * them (and the page hands focus back to the place).
 */
const heading = useTemplateRef<HTMLElement>('heading');
watch(
  () => props.feature?.id,
  async (id, previous) => {
    if (!id || id === previous) return;
    await nextTick();
    focusHeading(20);
  },
);

/* The drawer slides in, and a browser will not focus what is not visible yet. */
function focusHeading(attempts: number): void {
  const element = heading.value;
  if (!element) return;
  element.focus();
  if (document.activeElement !== element && attempts > 0) {
    setTimeout(() => {
      focusHeading(attempts - 1);
    }, 50);
  }
}

/** Only the layer's fields that this contribution actually filled in. */
const filledFields = computed(() => {
  const { feature, layer } = props;
  if (!feature || !layer) return [];
  return layer.fields.flatMap((field) => {
    if (field.type === 'url') return [];
    const value = feature.properties[field.key];
    if (value === undefined || value === null || value === '') return [];
    return [
      {
        key: field.key,
        label: field.label,
        type: field.type,
        text: formatPropertyValue(value, field.type),
      },
    ];
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
    <article
      v-if="props.feature"
      class="d-flex flex-column ga-4 pa-4"
      @keydown.esc.stop="emit('close')"
    >
      <div class="d-flex align-start ga-2">
        <div class="flex-grow-1">
          <h2 ref="heading" tabindex="-1" class="text-headline-small details-heading">
            {{ props.feature.name }}
          </h2>
          <div class="d-flex flex-wrap ga-2 mt-2">
            <v-chip v-if="props.layer" size="small" variant="flat" :color="props.layer.color">
              <!-- On the layer's colour, so the icon takes the chip's text colour. -->
              <LayerIcon :icon="props.layer.icon" color="currentColor" :size="16" class="mr-1" />
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

      <!--
        A plain link to Google Maps: a new tab on a computer, the Google Maps
        app on a phone that has it. Routes are navigated to their start.
      -->
      <div class="d-flex flex-wrap ga-2">
        <v-btn
          :href="navigationUrl ?? undefined"
          target="_blank"
          rel="noopener noreferrer"
          color="primary"
          variant="tonal"
          :prepend-icon="mdiNavigationVariant"
        >
          {{
            props.feature.geometry.type === 'LineString'
              ? t('feature.navigateToStart')
              : t('feature.navigate')
          }}
        </v-btn>
        <v-btn
          color="primary"
          variant="tonal"
          :prepend-icon="mdiShareVariant"
          @click="sharing = true"
        >
          {{ t('share.button') }}
        </v-btn>
      </div>
      <ShareDialog
        :open="sharing"
        :heading="t('share.placeHeading', { name: props.feature.name })"
        :title="props.feature.name"
        :query="`feature=${props.feature.id}`"
        @close="sharing = false"
      />

      <FeatureGallery :feature="props.feature" />

      <LinkifiedText v-if="props.feature.description" :text="props.feature.description" />

      <template v-if="filledFields.length > 0">
        <v-divider />
        <dl class="property-list">
          <div v-for="field in filledFields" :key="field.key">
            <dt class="text-body-small text-medium-emphasis">{{ field.label }}</dt>
            <dd>
              <OpeningHoursView v-if="field.type === 'openingHours'" :text="field.text" />
              <LinkifiedText v-else :text="field.text" tag="span" />
            </dd>
          </div>
        </dl>
      </template>

      <!--
        Where to read more: the place on Google Maps (reviews, photos, "open
        now") for every place, then whichever of its own links it has.
      -->
      <v-divider />
      <section :aria-labelledby="linksHeadingId">
        <h3 :id="linksHeadingId" class="text-title-small mb-2">{{ t('feature.links') }}</h3>
        <!-- The theme's link green: the brand green on white, a lighter one on dark. -->
        <div class="link-grid">
          <v-btn
            :href="googleMapsUrl ?? undefined"
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
            color="link"
            :prepend-icon="mdiGoogleMaps"
            class="link-button"
          >
            Google Maps
          </v-btn>
          <v-btn
            v-for="link in links"
            :key="link.key"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
            color="link"
            :prepend-icon="link.icon"
            class="link-button"
          >
            {{ link.label }}
          </v-btn>
        </div>
      </section>

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

      <div v-if="mayChange || mayDelete" class="d-flex flex-wrap ga-2">
        <v-btn
          v-if="mayChange"
          variant="text"
          :prepend-icon="mdiPencil"
          @click="emit('edit', props.feature)"
        >
          {{ changeIsSuggestion ? t('suggestion.button') : t('app.edit') }}
        </v-btn>
        <v-btn
          v-if="mayChange && props.feature.geometry.type === 'Point'"
          variant="text"
          :prepend-icon="mdiCursorMove"
          @click="emit('move', props.feature)"
        >
          {{ t('feature.move') }}
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
/* Focused by script, not by Tab: a quiet ring is enough to show where you are. */
.details-heading:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 4px;
  border-radius: 4px;
}

.property-list {
  display: grid;
  gap: 8px;
  margin: 0;
}

.property-list dd {
  margin: 0;
}

/* Two to a row in the drawer, one to a row when there is no room for two. */
.link-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}

/*
 * Labels as the layer writes them ("Gourmet Bornholm"): a long one wraps onto
 * a second line, left-aligned next to its icon, instead of being cut off.
 */
.link-button {
  justify-content: flex-start;
  min-width: 0;
  height: auto;
  min-height: 36px;
  padding-block: 6px;
  padding-inline: 12px;
  text-transform: none;
}

.link-button :deep(.v-btn__content) {
  flex: 1 1 auto;
  min-width: 0;
  justify-content: flex-start;
  white-space: normal;
  text-align: start;
  line-height: 1.2;
  overflow-wrap: anywhere;
}
</style>
