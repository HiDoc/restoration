<template>
  <div class="world-section">
    <div class="group">
      <div class="row">
        <label>Width</label>
        <input type="number" :value="worldWidth" @input="onWidth" min="2" max="64" />
      </div>
      <div class="row">
        <label>Height</label>
        <input type="number" :value="worldHeight" @input="onHeight" min="2" max="64" />
      </div>
      <div class="row">
        <label>Seed</label>
        <input type="number" :value="seed" @input="onSeed" />
      </div>
      <div class="row">
        <label>Active radius</label>
        <input type="number" :value="activeRadius" @input="onActive" min="0" max="10" />
        <button @click="$emit('applyActiveRadius')">Apply</button>
      </div>
      <div class="row">
        <label>Max active</label>
        <input type="number" :value="maxActive" @input="onMaxActive" :max="worldWidth * worldHeight" />
      </div>
      <div class="row">
        <button @click="$emit('recreate')">Recreate World</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  worldWidth: number;
  worldHeight: number;
  seed: number;
  activeRadius: number;
  maxActive: number;
}>();

const emit = defineEmits<{
  'update:world-width': [value: number];
  'update:world-height': [value: number];
  'update:seed': [value: number];
  'update:active-radius': [value: number];
  'update:max-active': [value: number];
  applyActiveRadius: [];
  recreate: [];
}>();

function onWidth(e: Event){ emit('update:world-width', Number((e.target as HTMLInputElement).value)) }
function onHeight(e: Event){ emit('update:world-height', Number((e.target as HTMLInputElement).value)) }
function onSeed(e: Event){ emit('update:seed', Number((e.target as HTMLInputElement).value)) }
function onActive(e: Event){ emit('update:active-radius', Number((e.target as HTMLInputElement).value)) }
function onMaxActive(e: Event){ emit('update:max-active', Number((e.target as HTMLInputElement).value)) }
</script>

<style scoped>
.world-section {
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

input {
  background: #1f1f1f;
  color: #fff;
  border: 1px solid #333;
  padding: 4px 6px;
}
</style>
