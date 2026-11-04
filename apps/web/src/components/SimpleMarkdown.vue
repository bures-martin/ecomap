<script setup lang="ts">
import { computed } from 'vue';
import { parseMarkdown } from './markdown.js';

/**
 * Admin-written text with headings, lists, bold and links (see `markdown.ts`).
 * Rendered as elements and text nodes only - never as HTML.
 */
const props = defineProps<{ source: string }>();

const blocks = computed(() => parseMarkdown(props.source));
</script>

<template>
  <div class="simple-markdown">
    <template v-for="(block, index) in blocks" :key="index">
      <component
        :is="block.kind === 'heading' ? `h${String(block.level + 1)}` : 'p'"
        v-if="block.kind !== 'list'"
        :class="
          block.kind === 'heading'
            ? block.level === 2
              ? 'text-title-large'
              : 'text-title-medium'
            : undefined
        "
      >
        <template v-for="(part, partIndex) in block.content" :key="partIndex">
          <a
            v-if="part.kind === 'link'"
            :href="part.href"
            target="_blank"
            rel="noopener noreferrer nofollow"
            >{{ part.text }}</a
          >
          <strong v-else-if="part.kind === 'strong'">{{ part.text }}</strong>
          <template v-else>{{ part.text }}</template>
        </template>
      </component>
      <ul v-else>
        <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
          <template v-for="(part, partIndex) in item" :key="partIndex">
            <a
              v-if="part.kind === 'link'"
              :href="part.href"
              target="_blank"
              rel="noopener noreferrer nofollow"
              >{{ part.text }}</a
            >
            <strong v-else-if="part.kind === 'strong'">{{ part.text }}</strong>
            <template v-else>{{ part.text }}</template>
          </template>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.simple-markdown {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-wrap: anywhere;
}

.simple-markdown > * {
  margin: 0;
}

.simple-markdown h3 {
  margin-top: 8px;
}

.simple-markdown h4 {
  font-weight: 600;
  margin-top: 4px;
}

.simple-markdown ul {
  margin: 0;
  padding-left: 1.4em;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.simple-markdown a {
  color: rgb(var(--v-theme-link));
}
</style>
