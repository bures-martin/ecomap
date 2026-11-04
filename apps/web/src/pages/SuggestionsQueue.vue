<script setup lang="ts">
import type { FeatureSuggestion, Layer, PropertyBag } from '@ecomap/shared';
import { useTranslation } from 'i18next-vue';
import { computed } from 'vue';
import { useDecideSuggestion, useLayers, useSuggestions } from '../api/queries.js';
import QueryBoundary from '../components/QueryBoundary.vue';
import { useApiErrorMessage } from '../composables/useApiErrorMessage.js';
import { useToast } from '../composables/useToast.js';
import { useLanguage } from '../i18n/index.js';

/**
 * Suggested changes to places already on the map, oldest first. Each shows
 * only what would change, as "now" against "suggested"; approving applies it.
 */
const { t } = useTranslation();
const language = useLanguage();
const toast = useToast();
const errorMessage = useApiErrorMessage();
const suggestionsQuery = useSuggestions(true);
const layersQuery = useLayers();
const decideSuggestion = useDecideSuggestion();

const layersById = computed(
  () => new Map((layersQuery.data.value ?? []).map((layer) => [layer.id, layer])),
);

interface ChangeRow {
  key: string;
  label: string;
  before: string;
  after: string;
}

const show = (value: PropertyBag[string] | undefined): string => {
  if (value === undefined || value === null || value === '') return t('suggestion.empty');
  if (typeof value === 'boolean') return value ? '✓' : '—';
  return String(value);
};

function rows(suggestion: FeatureSuggestion): ChangeRow[] {
  const { current, changes } = suggestion;
  const layer: Layer | undefined = layersById.value.get(suggestion.layerId);
  const result: ChangeRow[] = [];

  if (changes.name !== undefined && changes.name !== current.name) {
    result.push({
      key: 'name',
      label: t('suggestion.fieldName'),
      before: current.name,
      after: changes.name,
    });
  }
  if (changes.description !== undefined && changes.description !== current.description) {
    result.push({
      key: 'description',
      label: t('suggestion.fieldDescription'),
      before: show(current.description),
      after: show(changes.description),
    });
  }
  if (
    changes.geometry !== undefined &&
    JSON.stringify(changes.geometry) !== JSON.stringify(current.geometry)
  ) {
    result.push({
      key: 'geometry',
      label: t('suggestion.fieldLocation'),
      before: '',
      after: t('suggestion.moved'),
    });
  }
  if (changes.properties !== undefined) {
    result.push(...propertyRows(layer, current.properties, changes.properties));
  }
  return result;
}

function propertyRows(
  layer: Layer | undefined,
  before: PropertyBag,
  after: PropertyBag,
): ChangeRow[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const labels = new Map((layer?.fields ?? []).map((field) => [field.key, field.label]));
  return [...keys]
    .filter((key) => show(before[key]) !== show(after[key]))
    .map((key) => ({
      key: `properties.${key}`,
      label: labels.get(key) ?? key,
      before: show(before[key]),
      after: show(after[key]),
    }));
}

const decide = (id: string, decision: 'approve' | 'reject'): void => {
  decideSuggestion.mutate(
    { id, input: { decision } },
    {
      onSuccess: () => {
        toast.showSuccess(
          decision === 'approve' ? t('suggestion.approved') : t('suggestion.rejected'),
        );
      },
      onError: (error) => {
        toast.showError(errorMessage(error));
      },
    },
  );
};

const proposedBy = (suggestion: FeatureSuggestion): string => {
  const date = new Date(suggestion.createdAt).toLocaleDateString(language.value);
  return suggestion.proposedByName
    ? t('suggestion.by', { name: suggestion.proposedByName, date })
    : t('suggestion.byUnknown', { date });
};
</script>

<template>
  <section class="d-flex flex-column ga-4">
    <h2 class="text-title-large font-weight-bold">{{ t('suggestion.queueTitle') }}</h2>
    <QueryBoundary :query="suggestionsQuery">
      <template #default="{ data: suggestions }">
        <v-alert v-if="suggestions.length === 0" type="success" variant="tonal">
          {{ t('suggestion.queueEmpty') }}
        </v-alert>
        <v-card
          v-for="suggestion in suggestions"
          :key="suggestion.id"
          tag="article"
          class="pa-4 d-flex flex-column ga-3"
        >
          <div class="d-flex flex-wrap align-center ga-2">
            <h3 class="text-title-medium flex-grow-1">{{ suggestion.current.name }}</h3>
            <v-chip size="small">
              {{ layersById.get(suggestion.layerId)?.name ?? suggestion.layerSlug }}
            </v-chip>
          </div>
          <p class="text-body-small text-medium-emphasis">{{ proposedBy(suggestion) }}</p>

          <table class="change-table">
            <thead>
              <tr>
                <th scope="col">
                  <span class="d-sr-only">{{ t('suggestion.field') }}</span>
                </th>
                <th scope="col">{{ t('suggestion.before') }}</th>
                <th scope="col">{{ t('suggestion.after') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows(suggestion)" :key="row.key">
                <th scope="row">{{ row.label }}</th>
                <td class="change-table__before">{{ row.before }}</td>
                <td class="change-table__after">{{ row.after }}</td>
              </tr>
            </tbody>
          </table>

          <div class="d-flex flex-wrap ga-2">
            <v-btn color="primary" variant="flat" @click="decide(suggestion.id, 'approve')">
              {{ t('suggestion.approve') }}
            </v-btn>
            <v-btn color="error" variant="text" @click="decide(suggestion.id, 'reject')">
              {{ t('suggestion.reject') }}
            </v-btn>
            <v-spacer />
            <v-btn variant="text" :to="{ path: '/', query: { feature: suggestion.featureId } }">
              {{ t('suggestion.openPlace') }}
            </v-btn>
          </div>
        </v-card>
      </template>
    </QueryBoundary>
  </section>
</template>

<style scoped>
.change-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.875rem;
}

.change-table th,
.change-table td {
  padding: 6px 8px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.change-table thead th {
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.change-table tbody th {
  font-weight: 500;
  width: 26%;
}

.change-table__before {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  text-decoration: line-through;
  text-decoration-color: rgba(var(--v-theme-error), 0.5);
}

.change-table__after {
  background: rgba(var(--v-theme-success), 0.08);
  font-weight: 500;
}
</style>
