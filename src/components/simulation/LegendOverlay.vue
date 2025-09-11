<template>
  <div v-if="overlayLegend" class="legend-overlay">
    <template v-if="vizMode === 'rgb'">
      <div class="legend-row">
        <span class="swatch" style="background:#f33"></span>
        <span>Pollution</span>
      </div>
      <div class="legend-row">
        <span class="swatch" style="background:#3f3"></span>
        <span>Vitality</span>
      </div>
      <div class="legend-row">
        <span class="swatch" style="background:#39f"></span>
        <span>Moisture</span>
      </div>
    </template>
    <template v-else>
      <div class="legend-title">{{ vizMode }} intensity</div>
      <div class="gradient"></div>
      <div class="legend-scale">
        <span>low</span>
        <span>high</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  overlayLegend: boolean;
  vizMode: 'rgb' | 'vitality' | 'moisture' | 'pollution' | 'diversity' | 'succession' | 'pollinators';
}>();
</script>

<style scoped>
.legend-overlay {
  position: absolute;
  right: 12px;
  bottom: 12px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid #333;
  padding: 8px 10px;
  border-radius: 6px;
  color: #eee;
  font-size: 12px;
  min-width: 140px;
}

.legend-row {
  display: grid;
  grid-template-columns: 16px 1fr;
  align-items: center;
  gap: 8px;
  margin: 2px 0;
}

.swatch {
  width: 14px;
  height: 14px;
  border-radius: 2px;
  border: 1px solid #222;
  display: inline-block;
}

.legend-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.gradient {
  height: 10px;
  background: linear-gradient(90deg, #000, #fff);
  border: 1px solid #222;
  border-radius: 2px;
  margin-top: 4px;
}

.legend-scale {
  display: flex;
  justify-content: space-between;
  margin-top: 2px;
  color: #bbb;
}
</style>