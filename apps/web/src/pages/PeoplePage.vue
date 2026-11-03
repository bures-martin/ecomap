<script setup lang="ts">
import { ROLES, type CurrentUser, type Role } from '@ecomap/shared';
import { useTranslation } from 'i18next-vue';
import { computed } from 'vue';
import { useSetUserRole, useUsers } from '../api/queries.js';
import { useAuth } from '../auth/auth.js';
import QueryBoundary from '../components/QueryBoundary.vue';
import { useApiErrorMessage } from '../composables/useApiErrorMessage.js';
import { useToast } from '../composables/useToast.js';
import { useLanguage } from '../i18n/index.js';

const { t } = useTranslation();
const language = useLanguage();
const auth = useAuth();
const toast = useToast();
const errorMessage = useApiErrorMessage();

const usersQuery = useUsers();
const setRole = useSetUserRole();
const mayAssignRoles = computed(() => auth.can('role:assign'));

const roleItems = computed(() =>
  ROLES.map((role) => ({ title: t(`people.roles.${role}`), value: role })),
);

const changeRole = (person: CurrentUser, role: Role): void => {
  setRole.mutate(
    { id: person.id, role },
    {
      onSuccess: () => {
        toast.showSuccess(t('people.roleChanged'));
      },
      onError: (error) => {
        toast.showError(errorMessage(error));
      },
    },
  );
};
</script>

<template>
  <v-container class="page page-lg">
    <h1 class="text-headline-large font-weight-bold mb-2">{{ t('people.title') }}</h1>
    <p class="text-medium-emphasis mb-6">{{ t('people.intro') }}</p>

    <QueryBoundary :query="usersQuery">
      <template #default="{ data: users }">
        <v-card>
          <v-table :aria-label="t('people.title')">
            <thead>
              <tr>
                <th>{{ t('people.name') }}</th>
                <th>{{ t('people.email') }}</th>
                <th>{{ t('people.twoFactor') }}</th>
                <th>{{ t('people.joined') }}</th>
                <th>{{ t('people.role') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="person in users" :key="person.id">
                <td>{{ person.displayName }}</td>
                <td>{{ person.email }}</td>
                <td>
                  <v-chip size="small" :color="person.totpEnabled ? 'success' : undefined">
                    {{ person.totpEnabled ? t('auth.twoFactorOn') : t('auth.twoFactorOff') }}
                  </v-chip>
                </td>
                <td>{{ new Date(person.createdAt).toLocaleDateString(language) }}</td>
                <td>
                  <v-select
                    v-if="mayAssignRoles"
                    :model-value="person.role"
                    :items="roleItems"
                    :aria-label="`${t('people.role')}: ${person.displayName}`"
                    density="compact"
                    hide-details
                    class="role-select"
                    @update:model-value="(role: Role) => changeRole(person, role)"
                  />
                  <v-chip v-else size="small">{{ t(`people.roles.${person.role}`) }}</v-chip>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </template>
    </QueryBoundary>
  </v-container>
</template>

<style scoped>
.role-select {
  min-width: 150px;
}
</style>
