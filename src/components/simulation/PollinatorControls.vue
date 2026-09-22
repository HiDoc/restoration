<template>
  <div class="pollinator-section">
    <div class="group">
      <div class="row">
        <label>
          <input type="checkbox" :checked="showBees" @change="onShowBees" /> 
          Show bees
        </label>
      </div>
      <div class="row">
        <label>
          <input type="checkbox" :checked="showArrows" @change="onShowArrows" /> 
          Show flow arrows
        </label>
      </div>
      <div class="row">
        <label>Diffusion</label>
        <input type="number" :value="diffusionRate" @input="onDiffusion" min="0" max="0.1" step="0.005" />
      </div>
      <div class="row">
        <label>Diversity W</label>
        <input type="number" :value="diversityWeight" @input="onDiversity" step="0.005" />
      </div>
      <div class="row">
        <label>Light W</label>
        <input type="number" :value="lightWeight" @input="onLight" step="0.005" />
      </div>
      <div class="row">
        <label>Canopy W</label>
        <input type="number" :value="canopyWeight" @input="onCanopy" step="0.005" />
      </div>
      <div class="row">
        <label>Temp W</label>
        <input type="number" :value="tempWeight" @input="onTemp" step="0.005" />
      </div>
      <div class="row">
        <label>Wind -</label>
        <input type="number" :value="windPenalty" @input="onWind" step="0.005" />
      </div>
      <div class="row">
        <label>Rain -</label>
        <input type="number" :value="rainPenalty" @input="onRain" step="0.005" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  showBees?: boolean;
  showArrows?: boolean;
  diffusionRate?: number;
  diversityWeight?: number;
  lightWeight?: number;
  canopyWeight?: number;
  tempWeight?: number;
  windPenalty?: number;
  rainPenalty?: number;
}>(), {
  showBees: false,
  showArrows: false,
  diffusionRate: 0.02,
  diversityWeight: 0.04,
  lightWeight: 0.04,
  canopyWeight: 0.04,
  tempWeight: 0.04,
  windPenalty: 0.02,
  rainPenalty: 0.02,
});

const emit = defineEmits<{
  'update:show-bees': [value: boolean];
  'update:show-arrows': [value: boolean];
  'update:diffusion-rate': [value: number];
  'update:diversity-weight': [value: number];
  'update:light-weight': [value: number];
  'update:canopy-weight': [value: number];
  'update:temp-weight': [value: number];
  'update:wind-penalty': [value: number];
  'update:rain-penalty': [value: number];
}>();

function onShowBees(e: Event){ emit('update:show-bees', (e.target as HTMLInputElement).checked) }
function onShowArrows(e: Event){ emit('update:show-arrows', (e.target as HTMLInputElement).checked) }
function onDiffusion(e: Event){ emit('update:diffusion-rate', Number((e.target as HTMLInputElement).value)) }
function onDiversity(e: Event){ emit('update:diversity-weight', Number((e.target as HTMLInputElement).value)) }
function onLight(e: Event){ emit('update:light-weight', Number((e.target as HTMLInputElement).value)) }
function onCanopy(e: Event){ emit('update:canopy-weight', Number((e.target as HTMLInputElement).value)) }
function onTemp(e: Event){ emit('update:temp-weight', Number((e.target as HTMLInputElement).value)) }
function onWind(e: Event){ emit('update:wind-penalty', Number((e.target as HTMLInputElement).value)) }
function onRain(e: Event){ emit('update:rain-penalty', Number((e.target as HTMLInputElement).value)) }
</script>

<style scoped>
.pollinator-section {
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

input {
  background: #1f1f1f;
  color: #fff;
  border: 1px solid #333;
  padding: 4px 6px;
}

input[type="checkbox"] {
  margin: 0;
}
</style>
