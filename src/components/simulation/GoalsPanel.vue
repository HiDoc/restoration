<script setup lang="ts">
import { computed } from 'vue';
import { useGoalsStore } from '@/stores/goalsStore';
import type { GoalProgress } from '@/simulation/GoalsSystem';

const goalsStore = useGoalsStore();

// Computed properties
const activeGoals = computed(() => goalsStore.activeGoals);
const completionPercentage = computed(() => goalsStore.completionPercentage);
const totalPointsFromGoals = computed(() => goalsStore.totalPointsFromGoals);

// Format progress percentage
function formatProgress(progress: number): string {
  return `${Math.round(progress * 100)}%`;
}

// Get progress bar color based on completion
function getProgressColor(progress: number): string {
  if (progress >= 1.0) return 'bg-emerald-500';
  if (progress >= 0.75) return 'bg-emerald-400';
  if (progress >= 0.5) return 'bg-yellow-400';
  if (progress >= 0.25) return 'bg-orange-400';
  return 'bg-slate-500';
}

// Get category icon
function getCategoryIcon(category: string): string {
  switch (category) {
    case 'biodiversity': return '🌿';
    case 'ecosystem_health': return '💚';
    case 'research': return '🔬';
    case 'succession': return '🌳';
    case 'pollution': return '🧹';
    default: return '🎯';
  }
}

// Get category color
function getCategoryColor(category: string): string {
  switch (category) {
    case 'biodiversity': return 'text-emerald-400';
    case 'ecosystem_health': return 'text-green-400';
    case 'research': return 'text-blue-400';
    case 'succession': return 'text-teal-400';
    case 'pollution': return 'text-purple-400';
    default: return 'text-slate-400';
  }
}

// Format current value for display
function formatValue(goal: GoalProgress): string {
  const { currentValue, goal: goalDef } = goal;

  // Handle percentage-based goals
  if (goalDef.category === 'ecosystem_health' || goalDef.category === 'pollution') {
    return `${Math.round(currentValue * 100)}%`;
  }

  // Handle count-based goals
  return Math.round(currentValue).toString();
}

// Format target value for display
function formatTarget(goal: GoalProgress): string {
  const { goal: goalDef } = goal;

  if (goalDef.category === 'ecosystem_health' || goalDef.category === 'pollution') {
    return `${Math.round(goalDef.targetValue * 100)}%`;
  }

  return Math.round(goalDef.targetValue).toString();
}
</script>

<template>
  <div class="sci-panel flex flex-col border border-amber-400/25 bg-gradient-to-br from-amber-950/75 via-slate-950/65 to-slate-950/80 p-3 shadow-xl overflow-hidden goals-panel">
    <!-- Header -->
    <div class="flex-shrink-0 mb-3">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-amber-100">
          Active Goals
        </h2>
        <span class="text-xs text-amber-300">
          {{ goalsStore.completionCount }}/{{ goalsStore.totalGoalCount }}
        </span>
      </div>

      <!-- Overall progress bar -->
      <div class="bg-slate-900/60 border border-slate-700/50 rounded-lg p-2">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs text-slate-300">Overall Progress</span>
          <span class="text-xs font-bold text-amber-400">{{ completionPercentage }}%</span>
        </div>
        <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
            :style="{ width: `${completionPercentage}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Goals list -->
    <div class="flex-1 overflow-y-auto space-y-2 pr-1">
      <div
        v-for="goalProgress in activeGoals"
        :key="goalProgress.goal.id"
        :class="[
          'border rounded-lg p-3 transition-all duration-300',
          goalProgress.completed
            ? 'bg-emerald-900/30 border-emerald-500/40'
            : 'bg-slate-800/60 border-slate-600/40'
        ]"
      >
        <!-- Goal header -->
        <div class="flex items-start justify-between mb-2">
          <div class="flex items-center gap-2 flex-1">
            <span class="text-lg">{{ getCategoryIcon(goalProgress.goal.category) }}</span>
            <div class="flex-1 min-w-0">
              <h3 :class="[
                'text-sm font-semibold truncate',
                goalProgress.completed ? 'text-emerald-300' : 'text-slate-200'
              ]">
                {{ goalProgress.goal.title }}
              </h3>
              <p class="text-xs text-slate-400 mt-0.5">
                {{ goalProgress.goal.description }}
              </p>
            </div>
          </div>
          <span v-if="goalProgress.completed" class="text-xl ml-2 flex-shrink-0">✓</span>
        </div>

        <!-- Progress bar -->
        <div class="mb-2">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-slate-400">
              {{ formatValue(goalProgress) }} / {{ formatTarget(goalProgress) }}
            </span>
            <span class="text-xs font-medium text-slate-300">
              {{ formatProgress(goalProgress.progress) }}
            </span>
          </div>
          <div class="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              :class="[
                'h-full transition-all duration-500',
                getProgressColor(goalProgress.progress)
              ]"
              :style="{ width: formatProgress(goalProgress.progress) }"
            ></div>
          </div>
        </div>

        <!-- Reward info -->
        <div class="flex items-center justify-between text-xs">
          <span :class="['capitalize', getCategoryColor(goalProgress.goal.category)]">
            {{ goalProgress.goal.category.replace('_', ' ') }}
          </span>
          <span :class="goalProgress.completed ? 'text-emerald-400' : 'text-amber-400'">
            <template v-if="goalProgress.completed">
              Earned: {{ goalProgress.goal.rewardPoints }} pts
            </template>
            <template v-else>
              Reward: {{ goalProgress.goal.rewardPoints }} pts
            </template>
          </span>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="activeGoals.length === 0" class="text-center py-8 text-slate-400 text-sm">
        <p>No active goals</p>
        <p class="text-xs mt-1">Goals will appear here as you progress</p>
      </div>
    </div>

    <!-- Footer stats -->
    <div class="flex-shrink-0 mt-3 pt-3 border-t border-slate-700/50">
      <div class="flex items-center justify-between text-xs">
        <span class="text-slate-400">Total Points Earned:</span>
        <span class="text-amber-400 font-bold">{{ totalPointsFromGoals }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.goals-panel {
  max-height: 100%;
}

/* Custom scrollbar for goals list */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.3);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(251, 191, 36, 0.3);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(251, 191, 36, 0.5);
}
</style>
