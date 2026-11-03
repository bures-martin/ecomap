<script setup lang="ts">
import { AVATAR_MAX_BYTES, AVATAR_SIZE } from '@ecomap/shared';
import { mdiImagePlus, mdiRotateRight } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { computed, onBeforeUnmount, ref, shallowRef, useId, useTemplateRef, watch } from 'vue';
import { authApi } from '../api/endpoints.js';
import { useAuth } from '../auth/auth.js';
import { useApiErrorMessage } from '../composables/useApiErrorMessage.js';
import { useToast } from '../composables/useToast.js';
import { ImagePreparationError, decodeImageFile, encodeCanvas } from '../images/encode.js';
import {
  INITIAL_CROP,
  MAX_ZOOM,
  MIN_ZOOM,
  drawCrop,
  panBy,
  rotateClockwise,
  zoomTo,
  type CropState,
} from './cropMath.js';

/**
 * Lets somebody fit a photo into the circle before it is uploaded.
 *
 * Everything happens in the browser: the photo is decoded, positioned and then
 * re-encoded as a small square, so neither the full-size original nor its EXIF
 * metadata (camera, location) ever leaves the device.
 */
const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

/** On-screen size of the square viewport, in CSS pixels. */
const VIEWPORT = 280;
const PAN_STEP = 10;
const ZOOM_STEP = 0.1;

const { t } = useTranslation();
const auth = useAuth();
const toast = useToast();
const errorMessage = useApiErrorMessage();
const instructionsId = useId();

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
const fileInput = useTemplateRef<HTMLInputElement>('fileInput');

const image = shallowRef<ImageBitmap | null>(null);
const crop = ref<CropState>({ ...INITIAL_CROP });
const error = ref<string | null>(null);
const saving = ref(false);
const dragOver = ref(false);

/* ---------------------------------------------------------- loading ---- */

const chooseFile = (): void => {
  fileInput.value?.click();
};

const onFileInput = (event: Event): void => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  /* Clear it, so picking the same file again still fires `change`. */
  input.value = '';
  if (file) void loadFile(file);
};

const onDrop = (event: DragEvent): void => {
  dragOver.value = false;
  const file = event.dataTransfer?.files[0];
  if (file) void loadFile(file);
};

async function loadFile(file: File): Promise<void> {
  error.value = null;
  try {
    const bitmap = await decodeImageFile(file);
    image.value?.close();
    image.value = bitmap;
    crop.value = { ...INITIAL_CROP };
  } catch (caught) {
    error.value = preparationMessage(caught);
  }
}

function preparationMessage(caught: unknown): string {
  if (!(caught instanceof ImagePreparationError)) return t('avatar.unreadable');
  if (caught.reason === 'not-image') return t('avatar.notImage');
  if (caught.reason === 'too-large') return t('avatar.fileTooLarge');
  return t('avatar.unreadable');
}

const reset = (): void => {
  image.value?.close();
  image.value = null;
  crop.value = { ...INITIAL_CROP };
  error.value = null;
  pointers.clear();
};

watch(
  () => props.open,
  (open) => {
    if (!open) reset();
  },
);

onBeforeUnmount(reset);

/* --------------------------------------------------------- rendering ---- */

let frame = 0;

function render(): void {
  frame = 0;
  const element = canvas.value;
  const context = element?.getContext('2d');
  if (!element || !context) return;

  const pixelRatio = window.devicePixelRatio || 1;
  const size = Math.round(VIEWPORT * pixelRatio);
  if (element.width !== size) {
    element.width = size;
    element.height = size;
  }

  context.clearRect(0, 0, size, size);
  if (image.value) drawCrop(context, image.value, crop.value, VIEWPORT, size);

  /* Dim everything outside the circle, then outline it. */
  const radius = size / 2 - pixelRatio;
  context.save();
  context.beginPath();
  context.rect(0, 0, size, size);
  context.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
  context.fillStyle = 'rgba(0, 0, 0, 0.55)';
  context.fill('evenodd');
  context.beginPath();
  context.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
  context.lineWidth = 2 * pixelRatio;
  context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  context.stroke();
  context.restore();
}

watch([image, crop, canvas], () => {
  if (frame === 0) frame = requestAnimationFrame(render);
});

/* ------------------------------------------------------ interaction ---- */

const update = (change: (bitmap: ImageBitmap, state: CropState) => CropState): void => {
  if (image.value) crop.value = change(image.value, crop.value);
};

const zoom = computed({
  get: () => crop.value.zoom,
  set: (value: number) => {
    update((bitmap, state) => zoomTo(bitmap, state, VIEWPORT, value));
  },
});

const rotate = (): void => {
  update((bitmap, state) => rotateClockwise(bitmap, state, VIEWPORT));
};

/** Active pointers, so two fingers can pinch to zoom. */
const pointers = new Map<number, { x: number; y: number }>();
let pinchDistance = 0;

const distanceBetweenPointers = (): number => {
  const [a, b] = [...pointers.values()];
  return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
};

const onPointerDown = (event: PointerEvent): void => {
  if (!image.value) return;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  pinchDistance = distanceBetweenPointers();
};

const onPointerMove = (event: PointerEvent): void => {
  const previous = pointers.get(event.pointerId);
  if (!previous) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (pointers.size >= 2) {
    const distance = distanceBetweenPointers();
    if (pinchDistance > 0) {
      const factor = distance / pinchDistance;
      update((bitmap, state) => zoomTo(bitmap, state, VIEWPORT, state.zoom * factor));
    }
    pinchDistance = distance;
    return;
  }

  const dx = event.clientX - previous.x;
  const dy = event.clientY - previous.y;
  update((bitmap, state) => panBy(bitmap, state, VIEWPORT, dx, dy));
};

const onPointerUp = (event: PointerEvent): void => {
  pointers.delete(event.pointerId);
  pinchDistance = distanceBetweenPointers();
};

const onWheel = (event: WheelEvent): void => {
  const factor = Math.exp(-event.deltaY * 0.0015);
  update((bitmap, state) => zoomTo(bitmap, state, VIEWPORT, state.zoom * factor));
};

const onKeydown = (event: KeyboardEvent): void => {
  if (!image.value) return;
  const step = event.shiftKey ? PAN_STEP * 4 : PAN_STEP;
  const pan = (dx: number, dy: number) => {
    update((bitmap, state) => panBy(bitmap, state, VIEWPORT, dx, dy));
  };

  switch (event.key) {
    case 'ArrowLeft':
      pan(-step, 0);
      break;
    case 'ArrowRight':
      pan(step, 0);
      break;
    case 'ArrowUp':
      pan(0, -step);
      break;
    case 'ArrowDown':
      pan(0, step);
      break;
    case '+':
    case '=':
      zoom.value = crop.value.zoom + ZOOM_STEP;
      break;
    case '-':
    case '_':
      zoom.value = crop.value.zoom - ZOOM_STEP;
      break;
    case 'r':
    case 'R':
      rotate();
      break;
    default:
      return;
  }
  event.preventDefault();
};

/* ------------------------------------------------------------ saving ---- */

const save = async (): Promise<void> => {
  const bitmap = image.value;
  if (!bitmap) return;

  saving.value = true;
  try {
    const output = document.createElement('canvas');
    output.width = AVATAR_SIZE;
    output.height = AVATAR_SIZE;
    const context = output.getContext('2d');
    if (!context) throw new Error(t('avatar.unreadable'));

    /* No transparency in a JPEG: give PNGs with an alpha channel a white backing. */
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
    drawCrop(context, bitmap, crop.value, VIEWPORT, AVATAR_SIZE);

    auth.setUser(await authApi.uploadAvatar(await encodeCanvas(output, AVATAR_MAX_BYTES)));
    toast.showSuccess(t('avatar.saved'));
    emit('close');
  } catch (caught) {
    error.value =
      caught instanceof ImagePreparationError ? preparationMessage(caught) : errorMessage(caught);
  } finally {
    saving.value = false;
  }
};

const onOpenChange = (value: boolean): void => {
  if (!value) emit('close');
};
</script>

<template>
  <v-dialog :model-value="props.open" max-width="400" @update:model-value="onOpenChange">
    <v-card :title="t('avatar.editorTitle')">
      <v-card-text class="d-flex flex-column align-center ga-4">
        <v-alert v-if="error" type="error" class="w-100">{{ error }}</v-alert>

        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="d-none"
          :aria-label="t('avatar.choose')"
          @change="onFileInput"
        />

        <!--
          The viewport is a focusable control of its own: the arrow keys move the
          photo, + and - zoom, R turns it. The instructions say so out loud.
        -->
        <div
          class="avatar-viewport"
          :class="{ 'avatar-viewport--empty': !image, 'avatar-viewport--drag': dragOver }"
          :style="{ width: `${VIEWPORT}px`, height: `${VIEWPORT}px` }"
          :tabindex="image ? 0 : -1"
          role="group"
          :aria-label="t('avatar.previewLabel')"
          :aria-describedby="instructionsId"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @wheel.prevent="onWheel"
          @keydown="onKeydown"
          @dragover.prevent="dragOver = true"
          @dragleave="dragOver = false"
          @drop.prevent="onDrop"
        >
          <canvas ref="canvas" class="avatar-canvas" aria-hidden="true" />
          <div v-if="!image" class="avatar-placeholder">
            <v-btn color="primary" variant="flat" :prepend-icon="mdiImagePlus" @click="chooseFile">
              {{ t('avatar.choose') }}
            </v-btn>
            <span class="text-body-small">{{ t('avatar.dropHint') }}</span>
          </div>
        </div>

        <p :id="instructionsId" class="text-body-small text-medium-emphasis text-center">
          {{ image ? t('avatar.instructions') : t('avatar.intro') }}
        </p>

        <template v-if="image">
          <div class="d-flex align-center ga-2 w-100">
            <v-slider
              v-model="zoom"
              :min="MIN_ZOOM"
              :max="MAX_ZOOM"
              :step="0.01"
              :label="t('avatar.zoom')"
              hide-details
              class="flex-grow-1"
            />
            <v-btn
              :icon="mdiRotateRight"
              variant="text"
              :aria-label="t('avatar.rotate')"
              :title="t('avatar.rotate')"
              @click="rotate"
            />
          </div>
          <v-btn variant="text" size="small" @click="chooseFile">
            {{ t('avatar.chooseAnother') }}
          </v-btn>
        </template>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="emit('close')">{{ t('app.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!image" :loading="saving" @click="save">
          {{ t('avatar.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.avatar-viewport {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.08);
  /* The editor handles every gesture itself; the page must not scroll or zoom. */
  touch-action: none;
  cursor: grab;
}

.avatar-viewport:active {
  cursor: grabbing;
}

.avatar-viewport:focus-visible {
  outline: 3px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.avatar-viewport--empty {
  cursor: default;
}

.avatar-viewport--drag {
  outline: 3px dashed rgb(var(--v-theme-primary));
}

.avatar-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.avatar-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #fff;
}
</style>
