<script setup lang="ts">
import { computed } from 'vue';
import type { ScenarioConfig } from '@/simulation/ScenarioSystem';

const props = defineProps<{
  scenario: ScenarioConfig | null;
  timeRemaining: number | null;
  timeProgress: number;
  scenarioProgress: number;
  completedGoalsCount: number;
}>();

const totalGoals = computed(() => props.scenario?.goalIds.length || 0);

const timeRemainingFormatted = computed(() => {
  if (props.timeRemaining === null) return null;
  return `${props.timeRemaining} ticks`;
});

const timePercentage = computed(() => {
  return Math.round((1 - props.timeProgress) * 100);
});

// Get urgency color for time remaining
const timeColor = computed(() => {
  if (props.timeProgress < 0.5) return 'text-emerald-400';
  if (props.timeProgress < 0.75) return 'text-yellow-400';
  return 'text-red-400';
});

const timeBgColor = computed(() => {
  if (props.timeProgress < 0.5) return 'bg-emerald-500';
  if (props.timeProgress < 0.75) return 'bg-yellow-500';
  return 'bg-red-500';
});
</script>

<template>
  <div
    v-if="scenario"
    class="fixed top-4 left-4 z-30 bg-slate-900/90 backdrop-blur-sm border-2 border-blue-400/40 rounded-lg shadow-2xl p-4 max-w-xs"
  >
    <!-- Scenario name -->
    <div class="flex items-center gap-2 mb-3">
      <div class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
      <h3 class="text-sm font-bold text-blue-300">{{ scenario.name }}</h3>
    </div>

    <!-- Goal progress -->
    <div class="mb-3">
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs text-slate-400">Goals Completed</span>
        <span class="text-xs font-semibold text-slate-300">
          {{ completedGoalsCount }} / {{ totalGoals }}
        </span>
      </div>
      <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
          :style="{ width: `${scenarioProgress * 100}%` }"
        ></div>
      </div>
    </div>

    <!-- Time remaining (if time-limited) -->
    <div v-if="scenario.timeLimit && timeRemaining !== null" class="mb-2">
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs text-slate-400">Time Remaining</span>
        <span :class="['text-xs font-semibold', timeColor]">
          {{ timeRemainingFormatted }}
        </span>
      </div>
      <div class="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          :class="['h-full transition-all duration-1000', timeBgColor]"
          :style="{ width: `${timePercentage}%` }"
        ></div>
      </div>
    </div>

    <!-- Reward -->
    <div class="pt-2 border-t border-slate-700/50 flex items-center justify-between">
      <span class="text-xs text-slate-400">Reward</span>
      <span class="text-sm font-bold text-amber-400">{{ scenario.rewardPoints }} pts</span>
    </div>
  </div>
</template>

<style scoped>
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
