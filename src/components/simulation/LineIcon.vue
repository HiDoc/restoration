<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path v-for="d in LINE_ICONS[name]" :key="d" :d="d" />
  </svg>
</template>

<script setup lang="ts">
import { LINE_ICONS, type LineIconName } from './lineIcons'

defineProps<{ name: LineIconName }>()
</script>
