<script setup lang="ts">
import { mdiChevronLeft, mdiChevronRight, mdiClose } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { computed, ref, useId, watch } from 'vue';
import { useDemoDialog } from './demo.js';
import stepLayer from './screens/1-layer.png';
import stepPin from './screens/2-pin.jpg';
import stepForm from './screens/3-form.jpg';

/**
 * What the read-only demo says when someone tries to sign in or add a place:
 * that on the real map members do exactly that, and - one tap further - how
 * it looks, in three screenshots of the real app.
 */
const { t } = useTranslation();
const demo = useDemoDialog();
const titleId = useId();

const showingSteps = ref(false);
const step = ref(0);
const steps = computed(() => [
  { image: stepLayer, caption: t('demo.step1') },
  { image: stepPin, caption: t('demo.step2') },
  { image: stepForm, caption: t('demo.step3') },
]);
const current = computed(() => steps.value[step.value] ?? steps.value[0]);

/* Every time it opens, it starts with the short explanation. */
watch(demo.open, (open) => {
  if (open) {
    showingSteps.value = false;
    step.value = 0;
  }
});
</script>

<template>
  <v-dialog
    :model-value="demo.open.value"
    :max-width="showingSteps ? 720 : 460"
    scrollable
    :aria-labelledby="titleId"
    @update:model-value="(value: boolean) => !value && demo.hide()"
  >
    <v-card>
      <div class="d-flex align-center pr-2">
        <v-card-title :id="titleId" class="flex-grow-1 text-wrap">
          {{ showingSteps ? t('demo.howTitle') : t('demo.title') }}
        </v-card-title>
        <v-btn :icon="mdiClose" variant="text" :aria-label="t('app.close')" @click="demo.hide()" />
      </div>

      <v-card-text v-if="!showingSteps" class="d-flex flex-column ga-3">
        <p>{{ t('demo.body') }}</p>
        <p class="text-medium-emphasis">{{ t('demo.limits') }}</p>
      </v-card-text>

      <v-card-text v-else class="d-flex flex-column ga-3">
        <figure class="demo-step">
          <img
            :src="current?.image"
            :alt="current?.caption"
            class="demo-step__image"
            width="1280"
            height="800"
          />
          <figcaption>
            <strong>{{ t('demo.stepOf', { step: step + 1, total: steps.length }) }}</strong>
            {{ current?.caption }}
          </figcaption>
        </figure>
      </v-card-text>

      <v-card-actions class="flex-wrap ga-2 px-4 pb-4">
        <template v-if="!showingSteps">
          <v-btn variant="tonal" color="primary" @click="showingSteps = true">
            {{ t('demo.howButton') }}
          </v-btn>
          <v-spacer />
          <v-btn variant="flat" color="primary" @click="demo.hide()">{{ t('demo.ok') }}</v-btn>
        </template>
        <template v-else>
          <v-btn
            variant="text"
            :prepend-icon="mdiChevronLeft"
            :disabled="step === 0"
            @click="step -= 1"
          >
            {{ t('demo.previous') }}
          </v-btn>
          <v-spacer />
          <v-btn
            v-if="step < steps.length - 1"
            variant="flat"
            color="primary"
            :append-icon="mdiChevronRight"
            @click="step += 1"
          >
            {{ t('demo.next') }}
          </v-btn>
          <v-btn v-else variant="flat" color="primary" @click="demo.hide()">
            {{ t('demo.ok') }}
          </v-btn>
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.demo-step {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
}

/* Never taller than about half the screen, so the caption and buttons stay in view on a phone. */
.demo-step__image {
  width: 100%;
  height: auto;
  max-height: 55dvh;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
