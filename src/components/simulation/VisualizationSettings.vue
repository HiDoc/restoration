<template>
  <div class="visualization-section">
    <div class="group">
      <div class="row">
        <label>Mode</label>
        <select :value="vizMode" @change="onMode">
          <option value="rgb">RGB: R=Pollution G=Vitality B=Moisture</option>
          <option value="vitality">Vitality Heat</option>
          <option value="moisture">Moisture Heat</option>
          <option value="pollution">Pollution Heat</option>
          <option value="diversity">Diversity Heat</option>
          <option value="succession">Succession Heat</option>
          <option value="pollinators">Pollinators Heat</option>
        </select>
      </div>
      <div class="row">
        <label>
          <input type="checkbox" :checked="showLabels" @change="onShowLabels" /> 
          Show labels
        </label>
      </div>
      <div class="row">
        <label>
          <input type="checkbox" :checked="overlayLegend" @change="onOverlay" /> 
          Overlay legend
        </label>
      </div>
      <div class="legend">
        <div class="legend-title">Legend</div>
        <template v-if="vizMode === 'rgb'">
          <div>R = Pollution</div>
          <div>G = Vitality</div>
          <div>B = Moisture</div>
        </template>
        <template v-else>
          <div>Grayscale: darker = low, lighter = high</div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  vizMode: 'rgb' | 'vitality' | 'moisture' | 'pollution' | 'diversity' | 'succession' | 'pollinators';
  showLabels: boolean;
  overlayLegend: boolean;
}>();

const emit = defineEmits<{
  'update:viz-mode': [value: 'rgb' | 'vitality' | 'moisture' | 'pollution' | 'diversity' | 'succession' | 'pollinators'];
  'update:show-labels': [value: boolean];
  'update:overlay-legend': [value: boolean];
}>();

function onMode(e: Event) {
  const v = (e.target as HTMLSelectElement).value as any
  emit('update:viz-mode', v)
}
function onShowLabels(e: Event) {
  emit('update:show-labels', (e.target as HTMLInputElement).checked)
}
function onOverlay(e: Event) {
  emit('update:overlay-legend', (e.target as HTMLInputElement).checked)
}
</script>

<style scoped>
.visualization-section {
  margin-bottom: 16px;
}

.group {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12px;
}

.row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 6px;
}

label {
  font-size: 12px;
  color: #ddd;
}

select {
  background: #1f1f1f;
  color: #fff;
  border: 1px solid #333;
  padding: 4px 6px;
}

.legend {
  font-size: 12px;
  color: #bbb;
  border: 1px dashed #444;
  padding: 6px;
  border-radius: 4px;
}

.legend-title {
  font-weight: 600;
  margin-bottom: 4px;
  color: #ddd;
}
</style>
