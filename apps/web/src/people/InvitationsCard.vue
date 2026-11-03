<script setup lang="ts">
import { invitableRoles, type Invitation, type InvitationStatus } from '@ecomap/shared';
import { useTranslation } from 'i18next-vue';
import { computed, useId } from 'vue';
import { useInvitations, useRevokeInvitation } from '../api/queries.js';
import { useAuth } from '../auth/auth.js';
import QueryBoundary from '../components/QueryBoundary.vue';
import { useApiErrorMessage } from '../composables/useApiErrorMessage.js';
import { useToast } from '../composables/useToast.js';
import { useLanguage } from '../i18n/index.js';

/** Invitations handed out so far, newest first, with a way to withdraw open ones. */
const { t } = useTranslation();
const language = useLanguage();
const auth = useAuth();
const toast = useToast();
const errorMessage = useApiErrorMessage();
const headingId = useId();

const invitationsQuery = useInvitations(() => auth.can('user:invite'));
const revokeInvitation = useRevokeInvitation();

const STATUS_COLOR: Readonly<Record<InvitationStatus, string | undefined>> = {
  pending: 'info',
  accepted: 'success',
  expired: undefined,
  revoked: undefined,
};

const myRoles = computed(() => invitableRoles(auth.user?.role));

const mayRevoke = (invitation: Invitation): boolean =>
  invitation.status === 'pending' && myRoles.value.includes(invitation.role);

const formatDate = (iso: string): string => new Date(iso).toLocaleDateString(language.value);

const revoke = (invitation: Invitation): void => {
  revokeInvitation.mutate(invitation.id, {
    onSuccess: () => {
      toast.showInfo(t('invite.revoked'));
    },
    onError: (error) => {
      toast.showError(errorMessage(error));
    },
  });
};
</script>

<template>
  <section :aria-labelledby="headingId">
    <h2 :id="headingId" class="text-title-large mb-3">{{ t('invite.listTitle') }}</h2>
    <QueryBoundary :query="invitationsQuery">
      <template #default="{ data: invitations }">
        <p v-if="invitations.length === 0" class="text-medium-emphasis">
          {{ t('invite.none') }}
        </p>
        <v-card v-else>
          <v-table :aria-label="t('invite.listTitle')">
            <thead>
              <tr>
                <th>{{ t('invite.for') }}</th>
                <th>{{ t('people.role') }}</th>
                <th>{{ t('invite.status') }}</th>
                <th>{{ t('invite.details') }}</th>
                <th class="text-right" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="invitation in invitations" :key="invitation.id">
                <td>{{ invitation.label || '—' }}</td>
                <td>{{ t(`people.roles.${invitation.role}`) }}</td>
                <td>
                  <v-chip size="small" :color="STATUS_COLOR[invitation.status]">
                    {{ t(`invite.statuses.${invitation.status}`) }}
                  </v-chip>
                </td>
                <td class="text-body-small text-medium-emphasis">
                  <template v-if="invitation.status === 'accepted' && invitation.acceptedAt">
                    {{
                      t('invite.acceptedBy', {
                        name: invitation.acceptedByName ?? '—',
                        date: formatDate(invitation.acceptedAt),
                      })
                    }}
                  </template>
                  <template v-else>
                    {{
                      t('invite.createdBy', {
                        name: invitation.createdByName ?? '—',
                        date: formatDate(invitation.expiresAt),
                      })
                    }}
                  </template>
                </td>
                <td class="text-right">
                  <v-btn
                    v-if="mayRevoke(invitation)"
                    size="small"
                    variant="text"
                    color="error"
                    @click="revoke(invitation)"
                  >
                    {{ t('invite.revoke') }}
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </template>
    </QueryBoundary>
  </section>
</template>
