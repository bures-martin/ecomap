<script setup lang="ts">
import type { GeometryKind } from '@ecomap/shared';
import { mdiCheck, mdiClose, mdiCrosshairs, mdiRestart, mdiUndo } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { computed, onMounted, useTemplateRef } from 'vue';
import { MINIMUM_POSITIONS, type DrawingState } from './useDrawing.js';

const HINT_KEY: Readonly<Record<GeometryKind, string>> = {
  Point: 'draw.pointHint',
  LineString: 'draw.lineHint',
  Polygon: 'draw.polygonHint',
};

/**
 * Floating bar shown while the user is drawing.
 *
 * It is a live region: the running point count is announced, which is the only
 * feedback a screen-reader user gets from clicking on a map.
 */
const props = defineProps<{
  drawing: DrawingState;
  canFinish: boolean;
  /** Moving an existing place rather than drawing a new one. */
  moving?: boolean;
}>();
const emit = defineEmits<{
  finish: [];
  undo: [];
  reset: [];
  cancel: [];
  /** Places a point under the crosshair in the middle of the map - the keyboard way. */
  placeAtCenter: [];
}>();

const { t } = useTranslation();

const count = computed(() => props.drawing.positions.length);
const needed = computed(() => MINIMUM_POSITIONS[props.drawing.kind]);

/*
 * The bar takes focus when it appears, on the keyboard way of placing a point,
 * so nobody is left on a dialog that has just closed.
 */
const placeButton = useTemplateRef<{ $el: HTMLElement }>('placeButton');
onMounted(() => {
  placeButton.value?.$el.focus();
});
</script>

<template>
  <v-card
    elevation="6"
    role="region"
    :aria-label="t('draw.drawing')"
    class="drawing-toolbar px-4 py-3"
  >
    <p class="text-body-medium mb-2" aria-live="polite">
      <strong>{{ props.drawing.layer.name }}</strong> ·
      {{ props.moving ? t('draw.moveHint') : t(HINT_KEY[props.drawing.kind]) }}
      <template v-if="count > 0">({{ count }})</template>
      <template v-if="!props.canFinish && count > 0">
        {{ t('draw.needMorePoints', { count: needed }) }}
      </template>
    </p>
    <p class="text-body-small text-medium-emphasis mb-2">{{ t('draw.keyboardHint') }}</p>

    <div class="d-flex flex-wrap ga-2">
      <v-btn
        ref="placeButton"
        size="small"
        variant="tonal"
        color="primary"
        :prepend-icon="mdiCrosshairs"
        @click="emit('placeAtCenter')"
      >
        {{ t('draw.placeAtCenter') }}
      </v-btn>
      <v-btn
        size="small"
        variant="flat"
        color="primary"
        :prepend-icon="mdiCheck"
        :disabled="!props.canFinish"
        @click="emit('finish')"
      >
        {{ props.moving ? t('draw.useThisPosition') : t('draw.finish') }}
      </v-btn>
      <v-btn
        size="small"
        variant="text"
        :prepend-icon="mdiUndo"
        :disabled="count === 0"
        @click="emit('undo')"
      >
        {{ t('draw.undoPoint') }}
      </v-btn>
      <v-btn
        size="small"
        variant="text"
        :prepend-icon="mdiRestart"
        :disabled="count === 0"
        @click="emit('reset')"
      >
        {{ t('draw.startOver') }}
      </v-btn>
      <v-btn size="small" variant="text" :prepend-icon="mdiClose" @click="emit('cancel')">
        {{ t('draw.cancelDrawing') }}
      </v-btn>
    </div>
  </v-card>
</template>

<style scoped>
.drawing-toolbar {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  max-width: calc(100% - 24px);
}
</style>
