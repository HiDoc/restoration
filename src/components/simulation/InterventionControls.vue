<template>
  <div class="intervention-section">
    <div class="group">
      <div class="row">
        <label>Species</label>
        <select :value="speciesId" @change="onSpecies">
          <option v-for="species in speciesOptions" :key="species.id" :value="species.id">
            {{ species.name }}
          </option>
        </select>
      </div>
      <div class="row">
        <button @click="$emit('plantCenter')">Plant @ Center</button>
        <button @click="$emit('plantRandom')">Plant Random</button>
      </div>
      <div class="row">
        <label>Irrigate +</label>
        <input type="number" :value="irrigateAmount" @input="onIrrigate" min="0" max="1" step="0.05" />
        <button @click="$emit('irrigateCenter')">Apply</button>
      </div>
      <div class="row">
        <label>Cleanse -</label>
        <input type="number" :value="cleanseAmount" @input="onCleanse" min="0" max="1" step="0.05" />
        <button @click="$emit('cleanseCenter')">Apply</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SpeciesRegistry } from '@/simulation/SpeciesRegistry';

defineProps<{
  speciesId: string;
  irrigateAmount: number;
  cleanseAmount: number;
}>();

const emit = defineEmits<{
  'update:species-id': [value: string];
  'update:irrigate-amount': [value: number];
  'update:cleanse-amount': [value: number];
  plantCenter: [];
  plantRandom: [];
  irrigateCenter: [];
  cleanseCenter: [];
}>();

const speciesOptions = SpeciesRegistry.getInstance().getAllSpecies();

function onSpecies(e: Event){ emit('update:species-id', (e.target as HTMLSelectElement).value) }
function onIrrigate(e: Event){ emit('update:irrigate-amount', Number((e.target as HTMLInputElement).value)) }
function onCleanse(e: Event){ emit('update:cleanse-amount', Number((e.target as HTMLInputElement).value)) }
</script>

<style scoped>
.intervention-section {
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

button {
  padding: 6px 10px;
}

label {
  font-size: 12px;
  color: #ddd;
}

input,
select {
  background: #1f1f1f;
  color: #fff;
  border: 1px solid #333;
  padding: 4px 6px;
}
</style>
