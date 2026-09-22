<template>
  <div class="fixed left-1/2 bottom-3 z-30 -translate-x-1/2">
    <nav class="rounded-2xl border border-emerald-400/20 bg-gradient-to-r from-slate-950/85 via-emerald-950/60 to-slate-950/85 px-4 py-2 text-slate-100 shadow-xl backdrop-blur">
      <ul class="flex items-center gap-5">
        <li v-for="item in items" :key="item.key">
          <button class="flex flex-col items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors hover:bg-emerald-900/40"
                  :class="active===item.key ? 'text-emerald-300' : 'text-slate-300/80'"
                  @click="$emit('select', item.key)">
            <span class="text-base">{{ item.icon }}</span>
            <span class="leading-none">{{ item.label }}</span>
          </button>
        </li>
      </ul>
    </nav>
  </div>
  
</template>

<script setup lang="ts">
defineProps<{ active: string }>()
defineEmits<{ select: [value: string] }>()

const items = [
  { key: 'overview', icon: '📊', label: 'Overview' },
  { key: 'goals', icon: '🎯', label: 'Goals' },
  { key: 'species', icon: '🌱', label: 'Species' },
  { key: 'climate', icon: '🌤️', label: 'Climate' },
  { key: 'hydro', icon: '💧', label: 'Hydrology' },
  { key: 'canopy', icon: '🌳', label: 'Canopy' },
  { key: 'pollinators', icon: '🐝', label: 'Pollinators' },
  { key: 'interactions', icon: '🔗', label: 'Interactions' },
  { key: 'events', icon: '🧾', label: 'Events' },
  { key: 'settings', icon: '⚙️', label: 'Settings' },
]
</script>
