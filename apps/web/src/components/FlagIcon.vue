<script setup lang="ts">
import type { Locale } from '@ecomap/shared';

/**
 * A small flag for a language. Drawn as SVG because Windows has no flag emoji
 * (it shows the letters "DK" instead). Decorative: the language name is always
 * next to it or in the button's label.
 */
const props = withDefaults(defineProps<{ locale: Locale; size?: number }>(), { size: 22 });
</script>

<template>
  <svg
    class="flag-icon"
    :width="props.size"
    :height="Math.round((props.size * 2) / 3)"
    viewBox="0 0 60 40"
    aria-hidden="true"
    focusable="false"
  >
    <!-- Denmark: the Dannebrog, a white Nordic cross on red. -->
    <g v-if="props.locale === 'da'">
      <rect width="60" height="40" fill="#c8102e" />
      <rect x="17" width="6" height="40" fill="#ffffff" />
      <rect y="17" width="60" height="6" fill="#ffffff" />
    </g>
    <!-- English: the Union Flag. -->
    <g v-else>
      <clipPath id="flag-uk-clip">
        <rect width="60" height="40" />
      </clipPath>
      <g clip-path="url(#flag-uk-clip)">
        <rect width="60" height="40" fill="#012169" />
        <path d="M0,0 L60,40 M60,0 L0,40" stroke="#ffffff" stroke-width="8" />
        <path d="M0,0 L60,40 M60,0 L0,40" stroke="#c8102e" stroke-width="3" />
        <path d="M30,0 V40 M0,20 H60" stroke="#ffffff" stroke-width="12" />
        <path d="M30,0 V40 M0,20 H60" stroke="#c8102e" stroke-width="7" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.flag-icon {
  display: block;
  flex-shrink: 0;
  border-radius: 3px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15);
}
</style>
