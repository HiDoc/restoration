<template>
  <nav class="flex max-w-full items-end justify-start gap-1.5 overflow-x-auto px-3 pt-2 lg:justify-center" aria-label="Ecosystem sections">
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      class="nv-dock-tab nv-serif"
      :aria-selected="active === item.key"
      @click="$emit('select', item.key)"
    >
      <span class="nv-glyph" :style="{ '--glyph': `url(${nv(item.glyph)})` }" aria-hidden="true"></span>
      <span class="leading-none">{{ item.label }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { nv } from './nouveauAssets'

defineProps<{ active: string }>()
defineEmits<{ select: [value: string] }>()

const items = [
  { key: 'overview', glyph: 'icon-leaf', label: 'Overview' },
  { key: 'goals', glyph: 'glyph-goals', label: 'Goals' },
  { key: 'species', glyph: 'glyph-species', label: 'Codex' },
  { key: 'journal', glyph: 'icon-journal', label: 'Journal' },
  { key: 'climate', glyph: 'glyph-climate', label: 'Climate' },
  { key: 'hydro', glyph: 'glyph-hydrology', label: 'Hydrology' },
  { key: 'interactions', glyph: 'glyph-interactions', label: 'Interactions' },
  { key: 'events', glyph: 'glyph-events', label: 'Events' },
  { key: 'settings', glyph: 'glyph-settings', label: 'Settings' },
]
</script>
