<script setup lang="ts">
import { computed } from 'vue';
import { useInterventionStore } from '@/stores/interventionStore';
import type { InterventionType } from '@/simulation/InterventionManager';
import { SpeciesRegistry } from '@/simulation/SpeciesRegistry';

const interventionStore = useInterventionStore();

// Computed properties
const resourcePoints = computed(() => interventionStore.resourcePoints);
const availableInterventions = computed(() => interventionStore.availableInterventions);
const selectedIntervention = computed(() => interventionStore.selectedIntervention);
const plantSpecies = SpeciesRegistry.getInstance().getAllSpecies();

// Check availability for each intervention
function isAvailable(type: InterventionType): boolean {
  return interventionStore.canExecute(type);
}

function canAfford(type: InterventionType): boolean {
  return interventionStore.canAfford(type);
}

function isOnCooldown(type: InterventionType): boolean {
  return interventionStore.isOnCooldown(type);
}

function getCost(type: InterventionType): number {
  return interventionStore.getCost(type);
}

function getRemainingCooldown(type: InterventionType): number {
  return interventionStore.getRemainingCooldown(type);
}

// Actions
function selectIntervention(type: InterventionType) {
  if (isAvailable(type)) {
    interventionStore.selectIntervention(type);
  }
}

function deselectIntervention() {
  interventionStore.selectIntervention(null);
}

// Helper for button state classes
function getButtonClasses(type: InterventionType): string {
  const base = 'w-full px-3 py-3 rounded-lg text-left transition-all duration-200 border';

  if (!isAvailable(type)) {
    return `${base} bg-slate-900/50 border-slate-700/50 text-slate-500 cursor-not-allowed opacity-50`;
  }

  if (selectedIntervention.value === type) {
    return `${base} bg-emerald-600/30 border-emerald-400/60 text-emerald-100 shadow-lg`;
  }

  return `${base} bg-slate-800/60 border-slate-600/40 text-slate-200 hover:bg-emerald-700/20 hover:border-emerald-500/40 cursor-pointer`;
}

// Get status badge
function getStatusBadge(type: InterventionType): { text: string; color: string } {
  if (!canAfford(type)) {
    return { text: 'Insufficient Points', color: 'text-red-400' };
  }

  if (isOnCooldown(type)) {
    const remaining = getRemainingCooldown(type);
    return { text: `Cooldown: ${remaining} ticks`, color: 'text-yellow-400' };
  }

  return { text: 'Ready', color: 'text-emerald-400' };
}
</script>

<template>
  <div class="sci-panel flex flex-col border border-purple-400/25 bg-gradient-to-br from-purple-950/75 via-slate-950/65 to-slate-950/80 p-3 shadow-xl h-full overflow-hidden">
    <!-- Header with resource points -->
    <div class="flex-shrink-0 mb-3">
      <h2 class="text-xs font-semibold uppercase tracking-wide text-purple-100 mb-2">
        Interventions
      </h2>

      <div class="bg-slate-900/60 border border-slate-700/50 rounded-lg p-2 flex items-center justify-between">
        <span class="text-xs text-slate-300">Resource Points</span>
        <div class="flex items-center gap-1">
          <span class="text-lg font-bold text-emerald-400">{{ resourcePoints }}</span>
          <span class="text-xs text-slate-500">⚡</span>
        </div>
      </div>
    </div>

    <div class="mb-3 flex-shrink-0">
      <label for="plant-species" class="mb-1 block text-xs text-slate-200">Species to plant</label>
      <select id="plant-species" v-model="interventionStore.selectedPlantSpecies" class="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus-visible:outline-emerald-400">
        <option v-for="species in plantSpecies" :key="species.id" :value="species.id">{{ species.name }}</option>
      </select>
      <p class="mt-2 text-xs text-slate-300">Healthy days earn points. Plant different species to complete diversity goals.</p>
    </div>
    <p v-if="interventionStore.actionMessage" class="mb-3 text-xs text-emerald-200" role="status">{{ interventionStore.actionMessage }}</p>

    <!-- Instructions when intervention selected -->
    <div v-if="selectedIntervention" class="flex-shrink-0 mb-3 bg-emerald-900/30 border border-emerald-500/30 rounded-lg p-2">
      <p class="text-xs text-emerald-300">
        Click a chunk on the grid to apply this intervention
      </p>
      <button
        @click="deselectIntervention"
        class="mt-1 text-xs text-emerald-400 hover:text-emerald-300 underline"
      >
        Cancel
      </button>
    </div>

    <!-- Interventions list -->
    <div class="flex-1 overflow-y-auto space-y-2 pr-1">
      <button
        type="button"
        v-for="intervention in availableInterventions"
        :key="intervention.id"
        @click="selectIntervention(intervention.id)"
        :class="getButtonClasses(intervention.id)"
        :disabled="!isAvailable(intervention.id)"
        :aria-pressed="selectedIntervention === intervention.id"
      >
        <!-- Icon and name -->
        <div class="flex items-start justify-between mb-1">
          <div class="flex items-center gap-2">
            <span class="text-xl">{{ intervention.icon }}</span>
            <span class="text-sm font-semibold">{{ intervention.name }}</span>
          </div>
          <span :class="['text-xs font-medium', getStatusBadge(intervention.id).color]">
            {{ getStatusBadge(intervention.id).text }}
          </span>
        </div>

        <!-- Description -->
        <p class="text-xs text-slate-400 mb-2 ml-7">
          {{ intervention.description }}
        </p>

        <!-- Cost and cooldown info -->
        <div class="flex items-center justify-between text-xs ml-7">
          <div class="flex items-center gap-3">
            <span class="text-slate-400">
              Cost: <span :class="canAfford(intervention.id) ? 'text-emerald-400' : 'text-red-400'">
                {{ getCost(intervention.id) }}
              </span>
            </span>
            <span class="text-slate-500">
              Cooldown: {{ intervention.cooldownTicks }} ticks
            </span>
          </div>
        </div>

        <!-- Cooldown progress bar -->
        <div v-if="isOnCooldown(intervention.id)" class="mt-2 ml-7">
          <div class="h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-yellow-400 transition-all duration-300"
              :style="{
                width: `${(1 - (getRemainingCooldown(intervention.id) / intervention.cooldownTicks)) * 100}%`
              }"
            ></div>
          </div>
        </div>
      </button>
    </div>

    <!-- Usage stats footer -->
    <div class="flex-shrink-0 mt-3 pt-3 border-t border-slate-700/50">
      <div class="text-xs text-slate-400 space-y-1">
        <div class="flex justify-between">
          <span>Total Interventions:</span>
          <span class="text-slate-300">{{ interventionStore.usageStats.totalInterventions }}</span>
        </div>
        <div class="flex justify-between">
          <span>Total Spent:</span>
          <span class="text-slate-300">{{ interventionStore.usageStats.totalCost }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sci-panel {
  /* Inherits from existing panel styles */
}

/* Custom scrollbar for intervention list */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.3);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(139, 92, 246, 0.3);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(139, 92, 246, 0.5);
}
</style>
