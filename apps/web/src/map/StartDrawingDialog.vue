<script setup lang="ts">
import type { GeometryKind, Layer } from '@ecomap/shared';
import { mdiMapMarker, mdiTimelineOutline, mdiVectorPolygon } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { computed, ref, useId, watch } from 'vue';
import LayerIcon from './LayerIcon.vue';

const KIND_ICON: Readonly<Record<GeometryKind, string>> = {
  Point: mdiMapMarker,
  LineString: mdiTimelineOutline,
  Polygon: mdiVectorPolygon,
};

const KIND_LABEL: Readonly<Record<GeometryKind, string>> = {
  Point: 'draw.point',
  LineString: 'draw.line',
  Polygon: 'draw.polygon',
};

/**
 * Step one of adding something: which layer, and what shape.
 *
 * Only the geometries the chosen layer accepts are offered, so a "nature trails"
 * layer never invites somebody to drop a pin.
 */
const props = defineProps<{ open: boolean; layers: readonly Layer[] }>();
const emit = defineEmits<{ start: [layer: Layer, kind: GeometryKind]; cancel: [] }>();

const { t } = useTranslation();
const headingId = useId();
const layerId = ref('');

watch(
  () => [props.open, props.layers] as const,
  ([open, layers]) => {
    if (open) layerId.value = layers[0]?.id ?? '';
  },
  { immediate: true },
);

const layer = computed(() => props.layers.find((candidate) => candidate.id === layerId.value));

const onOpenChange = (value: boolean): void => {
  if (!value) emit('cancel');
};
</script>

<template>
  <v-dialog :model-value="props.open" max-width="444" @update:model-value="onOpenChange">
    <v-card :title="t('map.addContribution')">
      <v-card-text class="d-flex flex-column ga-4">
        <!--
          Radio buttons rather than a drop-down: every layer is in view at once,
          and the keyboard works the way it does everywhere - Tab into the group,
          the arrow keys to pick, Tab on to "where is it".
        -->
        <v-radio-group
          :model-value="layerId"
          :label="t('draw.chooseLayer')"
          hide-details
          density="compact"
          @update:model-value="(id: string | null) => (layerId = id ?? '')"
        >
          <v-radio v-for="choice in props.layers" :key="choice.id" :value="choice.id">
            <template #label>
              <span class="d-flex align-center ga-2">
                <LayerIcon :icon="choice.icon" :color="choice.color" />
                <span>{{ choice.name }}</span>
              </span>
            </template>
          </v-radio>
        </v-radio-group>

        <p v-if="layer?.description" class="text-body-medium text-medium-emphasis">
          {{ layer.description }}
        </p>

        <div v-if="layer">
          <p :id="headingId" class="text-title-small mb-2">{{ t('draw.choosePlacement') }}</p>
          <div class="d-flex flex-wrap ga-2" role="group" :aria-labelledby="headingId">
            <v-btn
              v-for="kind in layer.allowedGeometries"
              :key="kind"
              variant="outlined"
              :prepend-icon="KIND_ICON[kind]"
              @click="emit('start', layer, kind)"
            >
              {{ t(KIND_LABEL[kind]) }}
            </v-btn>
          </div>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="emit('cancel')">{{ t('app.cancel') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
