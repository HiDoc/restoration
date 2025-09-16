<template>
  <div class="fixed left-1/2 -translate-x-1/2 bottom-3 z-30">
    <nav class="rounded-2xl bg-surface/80 backdrop-blur border border-border shadow-glow px-4 py-2">
      <ul class="flex items-center gap-5">
        <li v-for="item in items" :key="item.key">
          <button class="flex flex-col items-center gap-1 text-xs px-2 py-1 rounded-md hover:bg-surface-alt"
                  :class="active===item.key ? 'text-accent' : 'text-text-secondary'"
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

