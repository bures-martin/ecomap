<script setup lang="ts">
import { ROLES, canBlockUser, invitableRoles, type CurrentUser, type Role } from '@ecomap/shared';
import { mdiAccountPlus, mdiContentCopy } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { computed, ref, shallowRef } from 'vue';
import {
  useCreateTemporaryPassword,
  useSetUserDisabled,
  useSetUserRole,
  useUsers,
} from '../api/queries.js';
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
const createTemporaryPassword = useCreateTemporaryPassword();

const mayAssignRoles = computed(() => auth.can('role:assign'));
const mayInvite = computed(() => invitableRoles(auth.user?.role).length > 0);

const inviteOpen = ref(false);
const blocking = shallowRef<CurrentUser | null>(null);
/** Asking before replacing someone's password... */
const resetting = shallowRef<CurrentUser | null>(null);
/** ...and then showing the new one, once. */
const temporary = shallowRef<{ name: string; password: string } | null>(null);

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

/*
 * Until reset by email exists: someone who forgot their password gets a
 * temporary one from an admin, handed over in person or by phone. It is shown
 * here once and never again.
 */
const resetPassword = (person: CurrentUser): void => {
  createTemporaryPassword.mutate(person.id, {
    onSuccess: ({ temporaryPassword }) => {
      resetting.value = null;
      temporary.value = { name: person.displayName, password: temporaryPassword };
    },
    onError: (error) => {
      resetting.value = null;
      toast.showError(errorMessage(error));
    },
  });
};

const copyTemporary = async (): Promise<void> => {
  if (!temporary.value) return;
  try {
    await navigator.clipboard.writeText(temporary.value.password);
    toast.showSuccess(t('people.passwordCopied'));
  } catch {
    /* No clipboard access: the password is on screen to copy by hand. */
  }
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
                        size="small"
                        variant="text"
                        :aria-label="`${t('people.newPassword')}: ${person.displayName}`"
                        @click="resetting = person"
                      >
                        {{ t('people.newPassword') }}
                      </v-btn>
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

    <ConfirmDialog
      :open="resetting !== null"
      :title="t('people.newPasswordConfirmTitle', { name: resetting?.displayName ?? '' })"
      :body="t('people.newPasswordConfirmBody')"
      :confirm-label="t('people.newPassword')"
      @confirm="resetting && resetPassword(resetting)"
      @cancel="resetting = null"
    />

    <v-dialog
      :model-value="temporary !== null"
      max-width="480"
      persistent
      @update:model-value="(open: boolean) => !open && (temporary = null)"
    >
      <v-card v-if="temporary" :title="t('people.temporaryTitle', { name: temporary.name })">
        <v-card-text class="d-flex flex-column ga-4">
          <p>{{ t('people.temporaryExplain', { name: temporary.name }) }}</p>
          <div class="d-flex align-center ga-2">
            <code class="temporary-password" aria-live="polite">{{ temporary.password }}</code>
            <v-btn
              :icon="mdiContentCopy"
              variant="text"
              :aria-label="t('people.copyPassword')"
              @click="copyTemporary"
            />
          </div>
          <p class="text-body-small text-medium-emphasis">{{ t('people.temporaryOnce') }}</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="flat" @click="temporary = null">
            {{ t('app.close') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.role-select {
  min-width: 150px;
}

.temporary-password {
  font-size: 1.25rem;
  letter-spacing: 0.05em;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  user-select: all;
}

.person--blocked td {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
</style>
