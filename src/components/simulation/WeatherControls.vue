<template>
  <div class="weather-section">
    <div class="group">
      <label>
        <input type="checkbox" :checked="storms" @change="onStorms" />
        Storms
      </label>
      <label>
        <input type="checkbox" :checked="droughts" @change="onDroughts" />
        Droughts
      </label>
      <label>
        <input type="checkbox" :checked="heatWaves" @change="onHeatWaves" />
        Heat Waves
      </label>
      <label>
        <input type="checkbox" :checked="coldSnaps" @change="onColdSnaps" />
        Cold Snaps
      </label>
      <label>
        <input type="checkbox" :checked="windStorms" @change="onWindStorms" />
        Wind Storms
      </label>
      <label>
        <input type="checkbox" :checked="fog" @change="onFog" />
        Fog
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  storms: boolean;
  droughts: boolean;
  heatWaves: boolean;
  coldSnaps: boolean;
  windStorms: boolean;
  fog: boolean;
}>();

const emit = defineEmits<{
  'update:storms': [value: boolean];
  'update:droughts': [value: boolean];
  'update:heatWaves': [value: boolean];
  'update:coldSnaps': [value: boolean];
  'update:windStorms': [value: boolean];
  'update:fog': [value: boolean];
}>();

function onStorms(e: Event){ emit('update:storms', (e.target as HTMLInputElement).checked) }
function onDroughts(e: Event){ emit('update:droughts', (e.target as HTMLInputElement).checked) }
function onHeatWaves(e: Event){ emit('update:heatWaves', (e.target as HTMLInputElement).checked) }
function onColdSnaps(e: Event){ emit('update:coldSnaps', (e.target as HTMLInputElement).checked) }
function onWindStorms(e: Event){ emit('update:windStorms', (e.target as HTMLInputElement).checked) }
function onFog(e: Event){ emit('update:fog', (e.target as HTMLInputElement).checked) }
</script>

<style scoped>
.weather-section {
  margin-bottom: 16px;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

label {
  font-size: 12px;
  color: #ddd;
  display: flex;
  align-items: center;
  gap: 6px;
}

input[type="checkbox"] {
  margin: 0;
}
</style>
