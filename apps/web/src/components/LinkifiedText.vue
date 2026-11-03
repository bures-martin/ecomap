<script setup lang="ts">
import { computed } from 'vue';
import { linkify } from './linkify.js';

/**
 * Plain text with its web addresses turned into links that open in a new tab.
 * Everything is rendered as text nodes and `<a>` elements - never as HTML - so
 * contributors cannot inject markup.
 */
const props = withDefaults(defineProps<{ text: string; tag?: string }>(), { tag: 'p' });

const parts = computed(() => linkify(props.text));
</script>

<template>
  <component :is="props.tag" class="pre-wrap linkified">
    <template v-for="(part, index) in parts" :key="index">
      <a
        v-if="part.kind === 'link'"
        :href="part.href"
        target="_blank"
        rel="noopener noreferrer nofollow"
        >{{ part.text }}</a
      >
      <template v-else>{{ part.text }}</template>
    </template>
  </component>
</template>

<style scoped>
.linkified {
  overflow-wrap: anywhere;
}

.linkified a {
  color: rgb(var(--v-theme-primary));
}
</style>
