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
  { key: 'species', glyph: 'glyph-species', label: 'Codex' },
  { key: 'seeds', glyph: 'icon-plants', label: 'Seeds' },
  { key: 'journal', glyph: 'icon-journal', label: 'Journal' },
  { key: 'sites', glyph: 'btn-map', label: 'Sites' },
  { key: 'settings', glyph: 'glyph-settings', label: 'Settings' },
]
</script>
