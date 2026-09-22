<script setup lang="ts">
import { computed } from 'vue';
import type { ScenarioConfig } from '@/simulation/ScenarioSystem';

const props = defineProps<{
  show: boolean;
  scenarios: ScenarioConfig[];
  completedScenarioIds?: string[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', scenarioId: string): void;
}>();

// Group scenarios by difficulty
const scenariosByDifficulty = computed(() => {
  const grouped = {
    easy: [] as ScenarioConfig[],
    normal: [] as ScenarioConfig[],
    hard: [] as ScenarioConfig[]
  };

  props.scenarios.forEach(scenario => {
    grouped[scenario.difficulty].push(scenario);
  });

  return grouped;
});

// Check if scenario is completed
function isCompleted(scenarioId: string): boolean {
  return props.completedScenarioIds?.includes(scenarioId) || false;
}

// Get difficulty badge color
function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'easy': return 'bg-green-600 text-green-100';
    case 'normal': return 'bg-yellow-600 text-yellow-100';
    case 'hard': return 'bg-red-600 text-red-100';
    default: return 'bg-slate-600 text-slate-100';
  }
}

function selectScenario(scenarioId: string) {
  emit('select', scenarioId);
}

function close() {
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sci-fade">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        @click.self="close"
      >
        <div
          class="sci-modal max-w-5xl w-full max-h-[90vh] bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 border-2 border-blue-400/30 rounded-xl shadow-2xl overflow-hidden flex flex-col"
          @click.stop
        >
          <!-- Decorative header -->
          <div class="h-2 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500"></div>

          <!-- Modal header -->
          <div class="sci-modal-header px-6 py-4 border-b border-blue-400/20 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 class="text-2xl font-bold text-blue-100">
                Select Scenario
              </h2>
              <p class="text-sm text-slate-400 mt-1">
                Choose a challenge to begin your ecological journey
              </p>
            </div>
            <button
              @click="close"
              class="text-slate-400 hover:text-slate-200 transition-colors text-2xl"
            >
              ×
            </button>
          </div>

          <!-- Modal body -->
          <div class="sci-modal-body flex-1 overflow-y-auto px-6 py-6">
            <!-- Easy scenarios -->
            <div v-if="scenariosByDifficulty.easy.length > 0" class="mb-6">
              <h3 class="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                <span>Easy</span>
                <span class="text-xs px-2 py-0.5 bg-green-600/20 rounded-full">Beginner Friendly</span>
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="scenario in scenariosByDifficulty.easy"
                  :key="scenario.id"
                  @click="selectScenario(scenario.id)"
                  :class="[
                    'border-2 rounded-lg p-4 cursor-pointer transition-all duration-200',
                    isCompleted(scenario.id)
                      ? 'bg-emerald-900/30 border-emerald-500/40 hover:border-emerald-400/60'
                      : 'bg-slate-800/60 border-slate-600/40 hover:bg-slate-700/60 hover:border-green-500/40'
                  ]"
                >
                  <div class="flex items-start justify-between mb-2">
                    <h4 class="text-base font-semibold text-slate-200">{{ scenario.name }}</h4>
                    <span v-if="isCompleted(scenario.id)" class="text-xl">✓</span>
                  </div>

                  <p class="text-sm text-slate-400 mb-3 leading-relaxed">{{ scenario.description }}</p>

                  <div class="flex items-center justify-between text-xs">
                    <div class="flex items-center gap-2">
                      <span :class="['px-2 py-1 rounded', getDifficultyColor(scenario.difficulty)]">
                        Easy
                      </span>
                      <span class="text-slate-500">{{ scenario.goalIds.length }} goals</span>
                    </div>
                    <span class="text-amber-400 font-semibold">{{ scenario.rewardPoints }} pts</span>
                  </div>

                  <div v-if="scenario.timeLimit" class="mt-2 text-xs text-slate-500">
                    Time limit: {{ scenario.timeLimit }} ticks
                  </div>
                </div>
              </div>
            </div>

            <!-- Normal scenarios -->
            <div v-if="scenariosByDifficulty.normal.length > 0" class="mb-6">
              <h3 class="text-lg font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                <span>Normal</span>
                <span class="text-xs px-2 py-0.5 bg-yellow-600/20 rounded-full">Moderate Challenge</span>
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="scenario in scenariosByDifficulty.normal"
                  :key="scenario.id"
                  @click="selectScenario(scenario.id)"
                  :class="[
                    'border-2 rounded-lg p-4 cursor-pointer transition-all duration-200',
                    isCompleted(scenario.id)
                      ? 'bg-emerald-900/30 border-emerald-500/40 hover:border-emerald-400/60'
                      : 'bg-slate-800/60 border-slate-600/40 hover:bg-slate-700/60 hover:border-yellow-500/40'
                  ]"
                >
                  <div class="flex items-start justify-between mb-2">
                    <h4 class="text-base font-semibold text-slate-200">{{ scenario.name }}</h4>
                    <span v-if="isCompleted(scenario.id)" class="text-xl">✓</span>
                  </div>

                  <p class="text-sm text-slate-400 mb-3 leading-relaxed">{{ scenario.description }}</p>

                  <div class="flex items-center justify-between text-xs">
                    <div class="flex items-center gap-2">
                      <span :class="['px-2 py-1 rounded', getDifficultyColor(scenario.difficulty)]">
                        Normal
                      </span>
                      <span class="text-slate-500">{{ scenario.goalIds.length }} goals</span>
                    </div>
                    <span class="text-amber-400 font-semibold">{{ scenario.rewardPoints }} pts</span>
                  </div>

                  <div v-if="scenario.timeLimit" class="mt-2 text-xs text-slate-500">
                    Time limit: {{ scenario.timeLimit }} ticks
                  </div>
                </div>
              </div>
            </div>

            <!-- Hard scenarios -->
            <div v-if="scenariosByDifficulty.hard.length > 0">
              <h3 class="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
                <span>Hard</span>
                <span class="text-xs px-2 py-0.5 bg-red-600/20 rounded-full">Expert Only</span>
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="scenario in scenariosByDifficulty.hard"
                  :key="scenario.id"
                  @click="selectScenario(scenario.id)"
                  :class="[
                    'border-2 rounded-lg p-4 cursor-pointer transition-all duration-200',
                    isCompleted(scenario.id)
                      ? 'bg-emerald-900/30 border-emerald-500/40 hover:border-emerald-400/60'
                      : 'bg-slate-800/60 border-slate-600/40 hover:bg-slate-700/60 hover:border-red-500/40'
                  ]"
                >
                  <div class="flex items-start justify-between mb-2">
                    <h4 class="text-base font-semibold text-slate-200">{{ scenario.name }}</h4>
                    <span v-if="isCompleted(scenario.id)" class="text-xl">✓</span>
                  </div>

                  <p class="text-sm text-slate-400 mb-3 leading-relaxed">{{ scenario.description }}</p>

                  <div class="flex items-center justify-between text-xs">
                    <div class="flex items-center gap-2">
                      <span :class="['px-2 py-1 rounded', getDifficultyColor(scenario.difficulty)]">
                        Hard
                      </span>
                      <span class="text-slate-500">{{ scenario.goalIds.length }} goals</span>
                    </div>
                    <span class="text-amber-400 font-semibold">{{ scenario.rewardPoints }} pts</span>
                  </div>

                  <div v-if="scenario.timeLimit" class="mt-2 text-xs text-slate-500">
                    Time limit: {{ scenario.timeLimit }} ticks
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal footer -->
          <div class="sci-modal-footer px-6 py-4 bg-slate-900/50 border-t border-slate-700/50 flex items-center justify-between flex-shrink-0">
            <p class="text-xs text-slate-400">
              Scenarios provide structured challenges with specific goals and conditions
            </p>
            <button
              @click="close"
              class="px-4 py-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sci-fade-enter-active,
.sci-fade-leave-active {
  transition: opacity 0.3s ease;
}

.sci-fade-enter-from,
.sci-fade-leave-to {
  opacity: 0;
}

.sci-fade-enter-active .sci-modal {
  animation: modal-pop 0.3s ease;
}

@keyframes modal-pop {
  0% {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
