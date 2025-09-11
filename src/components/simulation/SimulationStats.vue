<template>
  <div class="stats-section">
    <h3>Stats</h3>
    <div class="group stats">
      <div>Tick: {{ stats.currentTick }}</div>
      <div>Active: {{ stats.activeChunks }}/{{ stats.totalChunks }}</div>
      <div>Avg Vitality: {{ stats.avgVitality.toFixed(3) }}</div>
      <div>Avg Pollution: {{ stats.avgPollution.toFixed(3) }}</div>
      <div>Total Species: {{ stats.totalSpecies }}</div>
      <div>Season: {{ stats.seasonName || '—' }} ({{ (((stats.seasonProgress ?? 0) * 100).toFixed(0)) }}%)</div>
      <div>Time: {{ timeLabel }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{
  stats: {
    currentTick: number;
    activeChunks: number;
    totalChunks: number;
    totalSpecies: number;
    avgVitality: number;
    avgPollution: number;
    seasonName?: string;
    seasonProgress?: number;
    dayFraction?: number;
  };
}>();

const timeLabel = computed(() => {
  const df = props.stats.dayFraction ?? 0
  const hours = Math.floor(df * 24)
  const minutes = Math.floor((df * 24 - hours) * 60)
  const hh = hours.toString().padStart(2, '0')
  const mm = minutes.toString().padStart(2, '0')
  return `${hh}:${mm}`
})
</script>

<style scoped>
.stats-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.group {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12px;
}

.stats {
  font-size: 12px;
  color: #ddd;
}

h3 {
  margin: 0;
}
</style>
