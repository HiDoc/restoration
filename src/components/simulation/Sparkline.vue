<template>
  <svg v-if="path" :viewBox="`-2 -2 ${W + 4} ${H + 4}`" class="sparkline" role="img" :aria-label="label">
    <path :d="path" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <circle :cx="W" :cy="last" r="2" fill="currentColor" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { sparkPath } from '@/game/glance'

const props = defineProps<{ values: number[]; label: string }>()
const [W, H] = [48, 14]
const path = computed(() => sparkPath(props.values, W, H))
// The last point's height, where the line ends in a dot.
const last = computed(() => Number(path.value.split(',').pop()))
</script>

<style>
.sparkline { width: 2.5rem; height: 1rem; color: var(--nv-brass-700); flex-shrink: 0; }
</style>
