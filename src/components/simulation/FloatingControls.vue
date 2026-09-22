<template>
  <div class="floating-controls">
    <!-- Play/Pause Button -->
    <button
      type="button"
      class="control-btn play-pause"
      :class="{ playing: isRunning }"
      :disabled="blocked"
      @click="$emit('toggle-play')"
      :title="isRunning ? 'Pause' : 'Play'"
      :aria-label="isRunning ? 'Pause simulation' : 'Play simulation'"
    >
      <span v-if="isRunning">⏸</span>
      <span v-else>▶</span>
    </button>
    <button type="button" class="control-btn text-control" :disabled="isRunning || blocked" @click="$emit('step')">Step one day</button>

    <!-- Season & Time Display -->
    <div class="season-display">
      <div class="season-name">{{ seasonName }}</div>
      <div class="year-info">Year {{ currentYear + 1 }} · {{ Math.round((yearProgress ?? 0) * 100) }}%</div>
    </div>

    <!-- Speed Controls -->
    <div class="speed-controls">
      <button
        type="button"
        class="speed-btn"
        @click="$emit('decrease-speed')"
        title="Slower"
        aria-label="Slower simulation"
        :disabled="speed >= 1000"
      >
        −
      </button>
      <div class="speed-value">{{ speedLabel }}</div>
      <button
        type="button"
        class="speed-btn"
        @click="$emit('increase-speed')"
        title="Faster"
        aria-label="Faster simulation"
        :disabled="speed <= 10"
      >
        +
      </button>
    </div>
    <div class="save-controls">
      <button type="button" class="control-btn text-control" :disabled="saving" @click="$emit('save')">{{ saving ? 'Saving…' : 'Save' }}</button>
      <button type="button" class="control-btn text-control" :disabled="loading" @click="$emit('load')">{{ loading ? 'Loading…' : 'Load' }}</button>
    </div>
    <button type="button" class="control-btn text-control" @click="$emit('scenarios')">Scenarios</button>

    <!-- View Mode Toggle -->
    <button
      type="button"
      class="control-btn view-toggle"
      @click="$emit('toggle-view-mode')"
      :title="viewMode === 'contemplative' ? 'Switch to Analytical' : 'Switch to Contemplative'"
      :aria-label="viewMode === 'contemplative' ? 'Switch to analytical view' : 'Switch to contemplative view'"
    >
      <span v-if="viewMode === 'contemplative'">🌿</span>
      <span v-else>📊</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  isRunning: boolean;
  seasonName: string;
  currentYear: number;
  speed: number;
  yearProgress?: number;
  blocked?: boolean;
  saving?: boolean;
  loading?: boolean;
  viewMode: 'contemplative' | 'analytical';
}>();

defineEmits<{
  (e: 'toggle-play'): void;
  (e: 'decrease-speed'): void;
  (e: 'increase-speed'): void;
  (e: 'toggle-view-mode'): void;
  (e: 'step'): void;
  (e: 'save'): void;
  (e: 'load'): void;
  (e: 'scenarios'): void;
}>();

const speedLabel = computed(() => `×${Number((100 / props.speed).toFixed(2))}`);
</script>

<style scoped>
.floating-controls {
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(12px);
  border-radius: 1rem;
  border: 1px solid rgba(139, 92, 66, 0.3);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  min-width: 180px;
  z-index: 100;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background: rgba(62, 48, 38, 0.5);
  border: 1px solid rgba(139, 92, 66, 0.4);
  border-radius: 0.5rem;
  color: rgb(226, 213, 196);
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: rgba(92, 68, 48, 0.7);
  border-color: rgba(159, 112, 86, 0.6);
  transform: translateY(-1px);
}

.play-pause {
  width: 100%;
  height: 3rem;
  font-size: 1.5rem;
}

.play-pause.playing {
  background: rgba(76, 108, 76, 0.5);
  border-color: rgba(104, 159, 106, 0.5);
}

.season-display {
  text-align: center;
  padding: 0.75rem 0.5rem;
  background: rgba(62, 48, 38, 0.3);
  border-radius: 0.5rem;
  border: 1px solid rgba(139, 92, 66, 0.25);
}

.season-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: rgb(210, 184, 156);
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.year-info {
  font-size: 0.75rem;
  color: rgb(180, 160, 140);
  opacity: 0.85;
}

.speed-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(62, 48, 38, 0.3);
  border-radius: 0.5rem;
  border: 1px solid rgba(139, 92, 66, 0.25);
}

.speed-btn {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(62, 48, 38, 0.5);
  border: 1px solid rgba(139, 92, 66, 0.4);
  border-radius: 0.375rem;
  color: rgb(226, 213, 196);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.speed-btn:hover {
  background: rgba(92, 68, 48, 0.7);
  border-color: rgba(159, 112, 86, 0.6);
}

.speed-value {
  flex: 1;
  text-align: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(210, 184, 156);
  font-family: 'SF Mono', 'Courier New', monospace;
}

.view-toggle {
  width: 100%;
  height: 2.5rem;
}

.text-control {
  min-height: 2.5rem;
  font-size: 0.875rem;
}

.save-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  transform: none;
}

button:focus-visible {
  outline: 2px solid rgb(210, 184, 156);
  outline-offset: 3px;
}

@media (max-width: 600px) {
  .floating-controls {
    top: 0.75rem;
    right: 0.75rem;
    min-width: 145px;
    padding: 0.75rem;
    gap: 0.5rem;
  }
}
</style>
