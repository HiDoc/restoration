<template>
  <div class="controls-section">
    <h3>Simulation Controls</h3>
    
    <!-- Main Control Buttons -->
    <div class="control-buttons">
      <button @click="$emit('start')" :disabled="isRunning" class="start-btn">▶ Start</button>
      <button @click="$emit('pause')" :disabled="!isRunning" class="pause-btn">⏸ Pause</button>
      <button @click="$emit('step')" class="step-btn">⏭ Step</button>
    </div>

    <div class="group">
      <div class="row">
        <label>Tick (ms)</label>
        <input
          type="number"
          :value="tickMs"
          @input="onTickMs"
          min="10"
          step="10"
        />
      </div>
      <div class="row">
        <label>Step x</label>
        <input
          type="number"
          :value="stepCount"
          @input="onStepCount"
          min="1"
          max="200"
        />
        <button @click="$emit('multiStep')">Go</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  tickMs: number;
  stepCount: number;
  isRunning?: boolean;
}>();

const emit = defineEmits<{
  start: [];
  pause: [];
  step: [];
  multiStep: [];
  'update:tick-ms': [value: number];
  'update:step-count': [value: number];
}>();

function onTickMs(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  emit('update:tick-ms', v)
}

function onStepCount(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  emit('update:step-count', v)
}
</script>

<style scoped>
.controls-section {
  margin-bottom: 16px;
  padding: 12px;
  background: #2a2a2a;
  border-radius: 8px;
}

.controls-section h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.control-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.control-buttons button {
  flex: 1;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.start-btn {
  background: #4ade80;
  color: #000;
}

.start-btn:hover:not(:disabled) {
  background: #22c55e;
}

.start-btn:disabled {
  background: #374151;
  color: #6b7280;
  cursor: not-allowed;
}

.pause-btn {
  background: #f59e0b;
  color: #000;
}

.pause-btn:hover:not(:disabled) {
  background: #d97706;
}

.pause-btn:disabled {
  background: #374151;
  color: #6b7280;
  cursor: not-allowed;
}

.step-btn {
  background: #3b82f6;
  color: #fff;
}

.step-btn:hover {
  background: #2563eb;
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
  background: #374151;
  color: #fff;
  border: 1px solid #4b5563;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s ease;
}

button:hover {
  background: #4b5563;
}

label {
  font-size: 12px;
  color: #d1d5db;
}

input {
  background: #1f2937;
  color: #fff;
  border: 1px solid #4b5563;
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 12px;
  width: 60px;
}

input:focus {
  outline: none;
  border-color: #3b82f6;
}
</style>
