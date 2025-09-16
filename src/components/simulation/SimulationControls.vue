<template>
  <div class="mb-4 sci-panel p-3">
    <h3 class="m-0 mb-3 text-sm font-semibold">Simulation Controls</h3>
    
    <!-- Main Control Buttons -->
    <div class="flex gap-2 mb-4">
      <button @click="$emit('start')" :disabled="isRunning" class="sci-btn-primary flex-1 text-xs">▶ Start</button>
      <button @click="$emit('pause')" :disabled="!isRunning" class="sci-btn flex-1 text-xs">⏸ Pause</button>
      <button @click="$emit('step')" class="sci-btn flex-1 text-xs">⏭ Step</button>
    </div>

    <div class="flex flex-row flex-wrap gap-3">
      <div class="grid grid-cols-[1fr_auto_auto] items-center gap-1.5">
        <label class="text-xs">Tick (ms)</label>
        <input
          class="sci-input w-20 py-1 px-1.5 text-xs"
          type="number"
          :value="tickMs"
          @input="onTickMs"
          min="10"
          step="10"
        />
      </div>
      <div class="grid grid-cols-[1fr_auto_auto] items-center gap-1.5">
        <label class="text-xs">Step x</label>
        <input
          class="sci-input w-20 py-1 px-1.5 text-xs"
          type="number"
          :value="stepCount"
          @input="onStepCount"
          min="1"
          max="200"
        />
        <button @click="$emit('multiStep')" class="sci-btn sci-btn-sm">Go</button>
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

<!-- All styles have been converted to Tailwind CSS classes -->
