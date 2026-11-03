<script setup lang="ts">
import { mdiClose } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { ref } from 'vue';

/**
 * A short hello for somebody's first visit: what this map is and the two
 * things to do with it. Shown once - closing it, or either button, remembers
 * that in the browser - and never over a link that points at a place.
 */
const props = defineProps<{ communityName: string; tagline: string }>();
const emit = defineEmits<{ add: [] }>();

const STORAGE_KEY = 'ecomap.welcomeSeen';

const { t } = useTranslation();

function seenBefore(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'yes';
  } catch {
    /* Storage blocked: show it, and it simply comes back next time. */
    return false;
  }
}

const open = ref(!seenBefore());

const dismiss = (): void => {
  open.value = false;
  try {
    localStorage.setItem(STORAGE_KEY, 'yes');
  } catch {
    /* Not remembered across visits, but closed for now. */
  }
};

const add = (): void => {
  dismiss();
  emit('add');
};
</script>

<template>
  <v-card
    v-if="open"
    class="welcome-card pa-5"
    color="header"
    elevation="6"
    role="region"
    :aria-label="t('welcome.label')"
  >
    <div class="d-flex align-start ga-2">
      <h2 class="text-title-large flex-grow-1">
        {{ t('welcome.title', { name: props.communityName }) }}
      </h2>
      <v-btn
        :icon="mdiClose"
        variant="text"
        size="small"
        :aria-label="t('app.close')"
        @click="dismiss"
      />
    </div>
    <p class="text-body-medium mt-1">{{ props.tagline || t('welcome.intro') }}</p>
    <p class="text-body-small text-medium-emphasis mt-2">{{ t('welcome.howTo') }}</p>
    <div class="d-flex flex-wrap ga-2 mt-4">
      <v-btn color="primary" variant="flat" @click="dismiss">{{ t('welcome.explore') }}</v-btn>
      <v-btn color="primary" variant="text" @click="add">{{ t('welcome.add') }}</v-btn>
    </div>
  </v-card>
</template>

<style scoped>
.welcome-card {
  position: absolute;
  left: 10px;
  /* Above the background-map switcher in the bottom-left corner. */
  bottom: 66px;
  z-index: 1000;
  max-width: 380px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

/* On a phone, leave room on the right for the round map buttons. */
@media (max-width: 599px) {
  .welcome-card {
    left: 10px;
    right: 84px;
    bottom: 66px;
  }
}
</style>
