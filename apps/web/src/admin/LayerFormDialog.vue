<script setup lang="ts">
import {
  GEOMETRY_KINDS,
  LAYER_ICONS,
  createLayerInputSchema,
  type GeometryKind,
  type Layer,
} from '@ecomap/shared';
import { useTranslation } from 'i18next-vue';
import { computed, ref, useId, watch } from 'vue';
import { useCreateLayer, useUpdateLayer } from '../api/queries.js';
import { fieldIssues, useApiErrorMessage } from '../composables/useApiErrorMessage.js';
import { useToast } from '../composables/useToast.js';
import FieldsEditor from './FieldsEditor.vue';
import { slugify, toLayerDraft } from './layerDraft.js';

const GEOMETRY_LABEL: Readonly<Record<GeometryKind, string>> = {
  Point: 'draw.point',
  LineString: 'draw.line',
  Polygon: 'draw.polygon',
};

const props = defineProps<{ open: boolean; layer: Layer | null }>();
const emit = defineEmits<{ close: [] }>();

const { t } = useTranslation();
const toast = useToast();
const errorMessage = useApiErrorMessage();
const createLayer = useCreateLayer();
const updateLayer = useUpdateLayer();
const geometryHeadingId = useId();
/* Widened to string: the draft holds whatever an older layer was saved with. */
const layerIcons: readonly string[] = LAYER_ICONS;

const draft = ref(toLayerDraft(props.layer));

/* Reset the draft, and any old error, whenever the dialog opens for a different layer. */
watch(
  () => `${String(props.open)}:${props.layer?.id ?? 'new'}`,
  () => {
    draft.value = toLayerDraft(props.layer);
    createLayer.reset();
    updateLayer.reset();
  },
);

const mutationError = computed(() =>
  props.layer ? updateLayer.error.value : createLayer.error.value,
);
const isPending = computed(() =>
  props.layer ? updateLayer.isPending.value : createLayer.isPending.value,
);
const issues = computed(() => fieldIssues(mutationError.value));
const messagesFor = (key: string): string[] => {
  const message = issues.value[key];
  return message ? [message] : [];
};

const onNameInput = (name: string): void => {
  draft.value.name = name;
  /* Suggest a slug while creating, never rewrite an existing one. */
  if (!props.layer) draft.value.slug = slugify(name);
};

const onGeometries = (value: GeometryKind[]): void => {
  /* A layer with no geometry could never be contributed to. */
  if (value.length > 0) draft.value.allowedGeometries = value;
};

const submit = (): void => {
  const parsed = createLayerInputSchema.safeParse(draft.value);
  if (!parsed.success) {
    toast.showError(parsed.error.issues[0]?.message ?? t('errors.validation_failed'));
    return;
  }

  const onSuccess = (): void => {
    toast.showSuccess(t('layerAdmin.saved'));
    emit('close');
  };
  const onError = (error: unknown): void => {
    toast.showError(errorMessage(error));
  };

  if (props.layer) {
    const { slug: _slug, ...rest } = parsed.data;
    updateLayer.mutate({ id: props.layer.id, input: rest }, { onSuccess, onError });
  } else {
    createLayer.mutate(parsed.data, { onSuccess, onError });
  }
};

const onOpenChange = (value: boolean): void => {
  if (!value) emit('close');
};
</script>

<template>
  <v-dialog :model-value="props.open" max-width="900" @update:model-value="onOpenChange">
    <v-card>
      <form novalidate @submit.prevent="submit">
        <v-card-title>{{
          props.layer ? t('layerAdmin.editLayer') : t('layerAdmin.newLayer')
        }}</v-card-title>

        <v-card-text class="d-flex flex-column ga-4">
          <v-alert v-if="mutationError !== null" type="error">{{
            errorMessage(mutationError)
          }}</v-alert>

          <v-text-field
            :model-value="draft.name"
            :label="t('layerAdmin.name')"
            required
            :error-messages="messagesFor('name')"
            @update:model-value="onNameInput"
          />

          <v-text-field
            v-model="draft.slug"
            :label="t('layerAdmin.slug')"
            :disabled="props.layer !== null"
            :hint="t('layerAdmin.slugHelp')"
            persistent-hint
            :error-messages="messagesFor('slug')"
          />

          <v-textarea
            v-model="draft.description"
            :label="t('layerAdmin.description')"
            rows="2"
            auto-grow
            :hint="t('layerAdmin.descriptionHelp')"
            persistent-hint
          />

          <div class="responsive-row">
            <v-text-field
              v-model="draft.color"
              :label="t('layerAdmin.color')"
              type="color"
              class="narrow-field"
            />
            <v-select
              :model-value="draft.icon"
              :items="layerIcons"
              :label="t('layerAdmin.icon')"
              @update:model-value="(icon: string | null) => (draft.icon = icon ?? draft.icon)"
            />
            <v-text-field
              :model-value="String(draft.sortOrder)"
              :label="t('layerAdmin.sortOrder')"
              type="number"
              class="narrow-field"
              @update:model-value="(value: string) => (draft.sortOrder = Number(value))"
            />
          </div>

          <div>
            <p :id="geometryHeadingId" class="text-title-small mb-2">
              {{ t('layerAdmin.geometries') }}
            </p>
            <v-btn-toggle
              :model-value="draft.allowedGeometries"
              multiple
              divided
              variant="outlined"
              density="comfortable"
              :aria-labelledby="geometryHeadingId"
              @update:model-value="onGeometries"
            >
              <v-btn v-for="kind in GEOMETRY_KINDS" :key="kind" :value="kind">
                {{ t(GEOMETRY_LABEL[kind]) }}
              </v-btn>
            </v-btn-toggle>
          </div>

          <div class="responsive-row">
            <v-checkbox
              :model-value="draft.isPublished"
              :label="t('layerAdmin.published')"
              hide-details
              @update:model-value="
                (checked: boolean | null) => (draft.isPublished = checked === true)
              "
            />
            <v-checkbox
              :model-value="draft.requiresModeration"
              :label="t('layerAdmin.requiresModeration')"
              hide-details
              @update:model-value="
                (checked: boolean | null) => (draft.requiresModeration = checked === true)
              "
            />
          </div>

          <v-divider />

          <FieldsEditor v-model:fields="draft.fields" />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="emit('close')">{{ t('app.cancel') }}</v-btn>
          <v-btn type="submit" color="primary" variant="flat" :loading="isPending">{{
            t('app.save')
          }}</v-btn>
        </v-card-actions>
      </form>
    </v-card>
  </v-dialog>
</template>

<style scoped>
@media (min-width: 600px) {
  .narrow-field {
    max-width: 140px;
  }
}
</style>
