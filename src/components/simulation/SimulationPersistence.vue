<template>
  <div class="persist-section">
    <div class="group">
      <div class="row">
        <button @click="$emit('save-now')">Save Now</button>
        <button @click="$emit('load-latest')">Load Latest</button>
        <button @click="$emit('clear-saves')">Clear</button>
      </div>
      <div class="row">
        <label>Backend</label>
        <select :value="backend" @change="onBackend">
          <option value="indexeddb">IndexedDB</option>
          <option value="sqlite">SQLite (sql.js)</option>
        </select>
      </div>
      <div class="row">
        <label>
          <input type="checkbox" :checked="autoSave" @change="onAuto" />
          Auto save every
        </label>
        <input type="number" :value="interval" @input="onInterval" min="10" step="10" />
        <span>ticks</span>
      </div>
      <div class="status">
        <div>Last saved tick: <b>{{ lastSavedTick ?? '—' }}</b></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ autoSave: boolean; interval: number; lastSavedTick: number | null; backend: 'indexeddb' | 'sqlite' }>()
const emit = defineEmits<{ 'update:auto-save': [value: boolean]; 'update:interval': [value: number]; 'save-now': []; 'load-latest': []; 'clear-saves': []; 'update:backend': [value: 'indexeddb' | 'sqlite'] }>()

function onAuto(e: Event) { emit('update:auto-save', (e.target as HTMLInputElement).checked) }
function onInterval(e: Event) { emit('update:interval', Number((e.target as HTMLInputElement).value)) }
function onBackend(e: Event) { emit('update:backend', (e.target as HTMLSelectElement).value as any) }
</script>

<style scoped>
.persist-section { margin-bottom: 16px; }
.group { display: flex; flex-direction: column; gap: 10px; }
.row { display: grid; grid-template-columns: auto auto auto 1fr; align-items: center; gap: 8px; }
.row select { background: #1f1f1f; color: #fff; border: 1px solid #333; padding: 4px 6px; }
.status { font-size: 12px; color: #ccc; }
button { padding: 6px 10px; }
input[type="number"] { background: #1f1f1f; color: #fff; border: 1px solid #333; padding: 4px 6px; width: 90px; }
label { font-size: 12px; color: #ddd; display: flex; align-items: center; gap: 6px; }
</style>
