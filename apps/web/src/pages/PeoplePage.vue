<script setup lang="ts">
import { ROLES, canBlockUser, invitableRoles, type CurrentUser, type Role } from '@ecomap/shared';
import { mdiAccountPlus } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { computed, ref, shallowRef } from 'vue';
import { useSetUserDisabled, useSetUserRole, useUsers } from '../api/queries.js';
import { useAuth } from '../auth/auth.js';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import QueryBoundary from '../components/QueryBoundary.vue';
import UserAvatar from '../components/UserAvatar.vue';
import { useApiErrorMessage } from '../composables/useApiErrorMessage.js';
import { useToast } from '../composables/useToast.js';
import { useLanguage } from '../i18n/index.js';
import InvitationsCard from '../people/InvitationsCard.vue';
import InviteDialog from '../people/InviteDialog.vue';

const { t } = useTranslation();
const language = useLanguage();
const auth = useAuth();
const toast = useToast();
const errorMessage = useApiErrorMessage();

const usersQuery = useUsers();
const setRole = useSetUserRole();
const setDisabled = useSetUserDisabled();

const mayAssignRoles = computed(() => auth.can('role:assign'));
const mayInvite = computed(() => invitableRoles(auth.user?.role).length > 0);

const inviteOpen = ref(false);
const blocking = shallowRef<CurrentUser | null>(null);

const roleItems = computed(() =>
  ROLES.map((role) => ({ title: t(`people.roles.${role}`), value: role })),
);

const mayBlock = (person: CurrentUser): boolean =>
  canBlockUser(auth.user ? { id: auth.user.id, role: auth.user.role } : null, person);

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

const updateStatus = (person: CurrentUser, disabled: boolean): void => {
  setDisabled.mutate(
    { id: person.id, disabled },
    {
      onSuccess: () => {
        toast.showSuccess(
          disabled
            ? t('people.blocked', { name: person.displayName })
            : t('people.unblocked', { name: person.displayName }),
        );
        blocking.value = null;
      },
      onError: (error) => {
        toast.showError(errorMessage(error));
        blocking.value = null;
      },
    },
  );
};
</script>

<template>
  <v-container class="page page-lg">
    <div class="d-flex flex-wrap align-center ga-4 mb-2">
      <h1 class="text-headline-large font-weight-bold flex-grow-1">{{ t('people.title') }}</h1>
      <v-btn
        v-if="mayInvite"
        color="primary"
        variant="flat"
        :prepend-icon="mdiAccountPlus"
        @click="inviteOpen = true"
      >
        {{ t('invite.button') }}
      </v-btn>
    </div>
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
                <th>{{ t('people.status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="person in users"
                :key="person.id"
                :class="{ 'person--blocked': person.disabled }"
              >
                <td>
                  <span class="d-flex align-center ga-3">
                    <UserAvatar :name="person.displayName" :src="person.avatarUrl" :size="32" />
                    {{ person.displayName }}
                  </span>
                </td>
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
                <td>
                  <span class="d-flex align-center ga-2 text-no-wrap">
                    <v-chip size="small" :color="person.disabled ? 'error' : 'success'">
                      {{ person.disabled ? t('people.statusBlocked') : t('people.statusActive') }}
                    </v-chip>
                    <template v-if="mayBlock(person)">
                      <v-btn
                        v-if="person.disabled"
                        size="small"
                        variant="text"
                        :aria-label="`${t('people.unblock')}: ${person.displayName}`"
                        @click="updateStatus(person, false)"
                      >
                        {{ t('people.unblock') }}
                      </v-btn>
                      <v-btn
                        v-else
                        size="small"
                        variant="text"
                        color="error"
                        :aria-label="`${t('people.block')}: ${person.displayName}`"
                        @click="blocking = person"
                      >
                        {{ t('people.block') }}
                      </v-btn>
                    </template>
                  </span>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </template>
    </QueryBoundary>

    <InvitationsCard v-if="mayInvite" class="mt-10" />

    <InviteDialog :open="inviteOpen" @close="inviteOpen = false" />

    <ConfirmDialog
      :open="blocking !== null"
      :title="t('people.blockConfirmTitle', { name: blocking?.displayName ?? '' })"
      :body="t('people.blockConfirmBody')"
      :confirm-label="t('people.block')"
      destructive
      @confirm="blocking && updateStatus(blocking, true)"
      @cancel="blocking = null"
    />
  </v-container>
</template>

<style scoped>
.role-select {
  min-width: 150px;
}

.person--blocked td {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
</style>
