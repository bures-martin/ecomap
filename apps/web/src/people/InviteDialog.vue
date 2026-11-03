<script setup lang="ts">
import {
  INVITATION_DEFAULT_DAYS,
  INVITATION_PAGE_PATH,
  invitableRoles,
  type Role,
} from '@ecomap/shared';
import { mdiCheck, mdiContentCopy } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { computed, ref, watch } from 'vue';
import { useCreateInvitation } from '../api/queries.js';
import { useAuth } from '../auth/auth.js';
import { useApiErrorMessage } from '../composables/useApiErrorMessage.js';

/**
 * Creates an invitation link. The link is shown once, right here: only its hash
 * is stored, so it cannot be looked up again later - a lost link is simply
 * withdrawn and a new one made.
 */
const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const EXPIRY_CHOICES = [1, INVITATION_DEFAULT_DAYS, 30] as const;

const { t } = useTranslation();
const auth = useAuth();
const errorMessage = useApiErrorMessage();
const createInvitation = useCreateInvitation();

const roles = computed(() => invitableRoles(auth.user?.role));
const role = ref<Role>('contributor');
const label = ref('');
const expiresInDays = ref<number>(INVITATION_DEFAULT_DAYS);
const link = ref<string | null>(null);
const copied = ref(false);

const roleItems = computed(() =>
  roles.value.map((value) => ({ title: t(`people.roles.${value}`), value })),
);
const expiryItems = computed(() =>
  EXPIRY_CHOICES.map((days) => ({
    title: t('invite.expiresInDays', { count: days }),
    value: days,
  })),
);

/* Start clean every time the dialog opens. */
watch(
  () => props.open,
  (open) => {
    if (!open) return;
    role.value = roles.value.includes('contributor') ? 'contributor' : (roles.value[0] ?? 'viewer');
    label.value = '';
    expiresInDays.value = INVITATION_DEFAULT_DAYS;
    link.value = null;
    copied.value = false;
    createInvitation.reset();
  },
);

const create = (): void => {
  createInvitation.mutate(
    { role: role.value, label: label.value, expiresInDays: expiresInDays.value },
    {
      onSuccess: ({ token }) => {
        /* The token goes after `#`: browsers never send the fragment to a server. */
        link.value = `${window.location.origin}${INVITATION_PAGE_PATH}#${token}`;
      },
    },
  );
};

const copy = async (): Promise<void> => {
  if (!link.value) return;
  try {
    await navigator.clipboard.writeText(link.value);
    copied.value = true;
  } catch {
    /* Clipboard blocked: the field is selectable, so it can still be copied by hand. */
    copied.value = false;
  }
};

const onOpenChange = (value: boolean): void => {
  if (!value) emit('close');
};
</script>

<template>
  <v-dialog :model-value="props.open" max-width="520" @update:model-value="onOpenChange">
    <v-card :title="link ? t('invite.readyTitle') : t('invite.title')">
      <v-card-text v-if="!link" class="d-flex flex-column ga-4">
        <p class="text-body-medium text-medium-emphasis">{{ t('invite.intro') }}</p>

        <v-alert v-if="createInvitation.error.value" type="error">
          {{ errorMessage(createInvitation.error.value) }}
        </v-alert>

        <v-select
          v-model="role"
          :items="roleItems"
          :label="t('people.role')"
          :hint="t(`invite.roleHelp.${role}`)"
          persistent-hint
        />
        <v-text-field
          v-model="label"
          :label="t('invite.label')"
          :hint="t('invite.labelHelp')"
          persistent-hint
          maxlength="120"
        />
        <v-select v-model="expiresInDays" :items="expiryItems" :label="t('invite.expiry')" />
      </v-card-text>

      <v-card-text v-else class="d-flex flex-column ga-4">
        <p class="text-body-medium">{{ t('invite.readyIntro') }}</p>
        <v-text-field
          :model-value="link"
          :label="t('invite.link')"
          readonly
          hide-details
          @focus="($event.target as HTMLInputElement).select()"
        >
          <template #append-inner>
            <v-btn
              :icon="copied ? mdiCheck : mdiContentCopy"
              variant="text"
              size="small"
              :aria-label="t('invite.copy')"
              :title="t('invite.copy')"
              @click="copy"
            />
          </template>
        </v-text-field>
        <p class="text-body-small text-medium-emphasis" aria-live="polite">
          {{ copied ? t('invite.copied') : t('invite.onlyOnce') }}
        </p>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <template v-if="!link">
          <v-btn @click="emit('close')">{{ t('app.cancel') }}</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="createInvitation.isPending.value"
            @click="create"
          >
            {{ t('invite.create') }}
          </v-btn>
        </template>
        <v-btn v-else color="primary" variant="flat" @click="emit('close')">
          {{ t('invite.done') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
