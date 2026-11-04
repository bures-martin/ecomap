<script setup lang="ts">
import type { Layer } from '@ecomap/shared';
import { mdiDelete, mdiPencil, mdiPlus } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { shallowRef, ref } from 'vue';
import LayerFormDialog from '../admin/LayerFormDialog.vue';
import { useDeleteLayer, useLayers } from '../api/queries.js';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import QueryBoundary from '../components/QueryBoundary.vue';
import { useApiErrorMessage } from '../composables/useApiErrorMessage.js';
import { useToast } from '../composables/useToast.js';
import LayerIcon from '../map/LayerIcon.vue';

/**
 * Layer administration - the CMS half of the application.
 *
 * Creating a layer here is the only thing needed to add a whole new category to
 * the map: the legend, the contribute form and the filters all follow from it.
 */
const { t } = useTranslation();
const layersQuery = useLayers();
const deleteLayer = useDeleteLayer();
const toast = useToast();
const errorMessage = useApiErrorMessage();

const editing = shallowRef<Layer | null>(null);
const creating = ref(false);
const deleting = shallowRef<Layer | null>(null);

const closeForm = (): void => {
  creating.value = false;
  editing.value = null;
};

const confirmDelete = (): void => {
  const target = deleting.value;
  if (!target) return;
  deleteLayer.mutate(
    { id: target.id, confirm: true },
    {
      onSuccess: () => {
        toast.showSuccess(t('layerAdmin.deleted'));
        deleting.value = null;
      },
      onError: (error) => {
        toast.showError(errorMessage(error));
        deleting.value = null;
      },
    },
  );
};
</script>

<template>
  <v-container class="page page-lg">
    <div class="d-flex align-center ga-4 mb-2">
      <h1 class="text-headline-large font-weight-bold flex-grow-1">{{ t('layerAdmin.title') }}</h1>
      <v-btn color="primary" variant="flat" :prepend-icon="mdiPlus" @click="creating = true">
        {{ t('layerAdmin.newLayer') }}
      </v-btn>
    </div>
    <p class="text-medium-emphasis mb-6">{{ t('layerAdmin.intro') }}</p>

    <QueryBoundary :query="layersQuery">
      <template #default="{ data: layers }">
        <v-card>
          <v-table :aria-label="t('layerAdmin.title')">
            <thead>
              <tr>
                <th>{{ t('layerAdmin.name') }}</th>
                <th>{{ t('layerAdmin.slug') }}</th>
                <th>{{ t('layerAdmin.geometries') }}</th>
                <th class="text-right">{{ t('map.layersHeading') }}</th>
                <th class="text-right" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="layer in layers" :key="layer.id">
                <td>
                  <span class="d-flex align-center ga-2">
                    <LayerIcon :icon="layer.icon" :color="layer.color" />
                    <span>{{ layer.name }}</span>
                    <v-chip v-if="!layer.isPublished" size="small">hidden</v-chip>
                    <v-chip v-if="layer.requiresModeration" size="small">reviewed</v-chip>
                  </span>
                </td>
                <td>
                  <code>{{ layer.slug }}</code>
                </td>
                <td>{{ layer.allowedGeometries.join(', ') }}</td>
                <td class="text-right">{{ layer.featureCount }}</td>
                <td class="text-right text-no-wrap">
                  <v-btn
                    :icon="mdiPencil"
                    variant="text"
                    :aria-label="`${t('app.edit')}: ${layer.name}`"
                    @click="editing = layer"
                  />
                  <v-btn
                    :icon="mdiDelete"
                    variant="text"
                    :aria-label="`${t('app.delete')}: ${layer.name}`"
                    @click="deleting = layer"
                  />
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </template>
    </QueryBoundary>

    <LayerFormDialog :open="creating || editing !== null" :layer="editing" @close="closeForm" />

    <ConfirmDialog
      :open="deleting !== null"
      :title="t('layerAdmin.deleteConfirmTitle', { name: deleting?.name ?? '' })"
      :body="t('layerAdmin.deleteConfirmBody', { count: deleting?.featureCount ?? 0 })"
      :confirm-label="t('app.delete')"
      destructive
      @cancel="deleting = null"
      @confirm="confirmDelete"
    />
  </v-container>
</template>
