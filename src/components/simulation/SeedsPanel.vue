<template>
  <div v-if="show" class="sci-modal-overlay" @click.self="$emit('close')">
    <div class="sci-modal nv-ornate flex max-h-[90vh] w-full max-w-lg flex-col" role="dialog" aria-labelledby="seeds-title">
      <!-- Indented to clear the frame's corner flourish -->
      <header class="flex items-baseline justify-between gap-2 pl-5">
        <h2 id="seeds-title" class="nv-heading text-2xl">Seeds</h2>
        <button type="button" class="nv-link" @click="$emit('close')">Close</button>
      </header>
      <p class="nv-small nv-muted mt-1 pl-5">Your pouch travels with you. Seed you collect remembers its parents and the site it was set on.</p>
      <ul class="mt-3 grid min-h-0 flex-1 gap-1 overflow-y-auto pr-1">
        <li v-if="pouch.length === 0" class="nv-small nv-muted">No seeds yet. Collect them from ripe plants in autumn, or earn them by completing goals.</li>
        <li v-for="line in pouch" :key="line.key" class="nv-panel flex items-center justify-between gap-2 p-2">
          <span>{{ line.label }}</span>
          <button type="button" class="nv-btn" @click="$emit('sow', line)">Sow</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PouchOption } from '@/game/seeds'

defineProps<{ show: boolean; pouch: PouchOption[] }>()
defineEmits<{ close: []; sow: [line: PouchOption] }>()
</script>
