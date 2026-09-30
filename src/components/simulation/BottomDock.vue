<template>
  <nav class="flex max-w-full items-end justify-start gap-1 overflow-x-auto px-1.5 pt-2 sm:gap-1.5 sm:px-3 lg:justify-center" aria-label="Ecosystem sections">
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      class="nv-dock-tab nv-serif"
      :aria-selected="active === item.key"
      @click="$emit('select', item.key)"
    >
      <span class="nv-glyph" :style="{ '--glyph': 'line' in item ? lineIconMask(item.line) : `url(${nv(item.glyph)})` }" aria-hidden="true"></span>
      <span class="leading-none">{{ item.label }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { nv } from './nouveauAssets'
import { lineIconMask, type LineIconName } from './lineIcons'

defineProps<{ active: string }>()
defineEmits<{ select: [value: string] }>()

const items: Array<{ key: string; label: string } & ({ glyph: string } | { line: LineIconName })> = [
  { key: 'overview', glyph: 'icon-leaf', label: 'Overview' },
  { key: 'species', glyph: 'glyph-species', label: 'Codex' },
  { key: 'seeds', line: 'seeds', label: 'Seeds' },
  { key: 'journal', glyph: 'icon-journal', label: 'Journal' },
  { key: 'sites', line: 'sites', label: 'Sites' },
  { key: 'settings', glyph: 'glyph-settings', label: 'Settings' },
]
</script>
