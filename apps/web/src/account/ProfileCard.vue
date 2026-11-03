<script setup lang="ts">
import type { CurrentUser } from '@ecomap/shared';
import { mdiCameraOutline } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { ref } from 'vue';
import { authApi } from '../api/endpoints.js';
import { useAuth } from '../auth/auth.js';
import UserAvatar from '../components/UserAvatar.vue';
import { useApiErrorMessage } from '../composables/useApiErrorMessage.js';
import { useToast } from '../composables/useToast.js';
import AvatarEditor from './AvatarEditor.vue';

/** Who you are on the map: picture, name, email and role. */
const props = defineProps<{ user: CurrentUser }>();

const { t } = useTranslation();
const auth = useAuth();
const toast = useToast();
const errorMessage = useApiErrorMessage();

const editorOpen = ref(false);
const removing = ref(false);

const removePhoto = async (): Promise<void> => {
  removing.value = true;
  try {
    auth.setUser(await authApi.removeAvatar());
    toast.showInfo(t('avatar.removed'));
  } catch (error) {
    toast.showError(errorMessage(error));
  } finally {
    removing.value = false;
  }
};
</script>

<template>
  <v-card class="pa-6">
    <div class="d-flex flex-wrap align-center ga-6">
      <UserAvatar
        :name="props.user.displayName"
        :src="props.user.avatarUrl"
        :size="96"
        :label="t('avatar.title')"
      />

      <div class="flex-grow-1">
        <h2 class="text-title-large">{{ props.user.displayName }}</h2>
        <p class="text-medium-emphasis">{{ props.user.email }}</p>
        <v-chip size="small" class="mt-2">{{ t(`people.roles.${props.user.role}`) }}</v-chip>
      </div>
    </div>

    <div class="d-flex flex-wrap ga-2 mt-4">
      <v-btn
        variant="outlined"
        color="primary"
        :prepend-icon="mdiCameraOutline"
        @click="editorOpen = true"
      >
        {{ props.user.avatarUrl ? t('avatar.change') : t('avatar.add') }}
      </v-btn>
      <v-btn
        v-if="props.user.avatarUrl"
        variant="text"
        color="error"
        :loading="removing"
        @click="removePhoto"
      >
        {{ t('avatar.remove') }}
      </v-btn>
    </div>

    <AvatarEditor :open="editorOpen" @close="editorOpen = false" />
  </v-card>
</template>
