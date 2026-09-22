<template>
  <div v-if="show" class="sci-modal-overlay" @click.self="$emit('close')">
    <div class="sci-modal max-w-6xl w-full max-h-[90vh] overflow-hidden border border-emerald-500/25 bg-gradient-to-br from-emerald-950/85 via-slate-950/70 to-slate-950 shadow-2xl sci-fade-in flex flex-col">
      <!-- Header -->
      <div class="sci-modal-header relative border-b border-emerald-400/25 bg-gradient-to-br from-emerald-900/40 via-slate-900/40 to-slate-950/60 px-8 py-6 flex-shrink-0">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-[0.7rem] uppercase tracking-[0.28em] text-emerald-200/80">Research Database</span>
            <h2 class="sci-modal-title text-2xl">📚 Field Guide</h2>
            <p class="text-sm text-slate-300/80 mt-1">
              {{ discoveredCount }} of {{ totalSpecies }} species discovered
            </p>
          </div>

          <!-- Progress -->
          <div class="flex flex-col items-end gap-2">
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-400">Discovery Progress</span>
              <span class="text-sm font-semibold text-emerald-200">{{ discoveryPercentage }}%</span>
            </div>
            <div class="w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                :style="{ width: `${discoveryPercentage}%` }"
              ></div>
            </div>
          </div>

          <!-- Close button -->
          <button
            class="sci-btn-ghost flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/60 text-xl text-slate-200 transition-colors hover:bg-emerald-700/70 hover:text-white"
            @click="$emit('close')"
            title="Close field guide"
          >
            ×
          </button>
        </div>
      </div>

      <!-- Body with scrolling -->
      <div class="sci-modal-body flex-1 overflow-y-auto">
        <div v-if="discoveredCount === 0" class="text-center py-12">
          <span class="text-6xl">🔍</span>
          <h3 class="text-xl font-semibold text-slate-300 mt-4">No Species Discovered Yet</h3>
          <p class="text-sm text-slate-400 mt-2">Explore the simulation to discover new species!</p>
        </div>

        <!-- Species Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="speciesId in discoveredSpeciesIds"
            :key="speciesId"
            class="sci-panel relative cursor-pointer bg-gradient-to-br from-slate-950/90 via-slate-950/80 to-slate-900/80 p-5 transition-all hover:-translate-y-1 hover:border-emerald-400/60 hover:shadow-emerald-500/20"
            :class="[
              selectedSpecies === speciesId
                ? 'border border-emerald-400/80 ring-2 ring-emerald-400/50'
                : 'border border-slate-700/60'
            ]"
            @click="selectSpecies(speciesId)"
          >
            <!-- Species Icon/Placeholder -->
            <div class="absolute top-2 right-2">
              <span class="text-3xl">🌿</span>
            </div>

            <!-- Species Name -->
            <h3 class="text-lg font-semibold text-emerald-100/90 mb-2">{{ getSpeciesName(speciesId) }}</h3>

            <!-- Research Progress -->
            <div class="mb-3">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-slate-400">Research Progress</span>
                <span class="text-emerald-300 font-semibold">{{ Math.round(getResearchProgress(speciesId) * 100) }}%</span>
              </div>
              <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
                  :style="{ width: `${getResearchProgress(speciesId) * 100}%` }"
                ></div>
              </div>
            </div>

            <!-- Observation Count -->
            <div class="flex items-center justify-between text-xs text-slate-300/80 mb-3">
              <span>Observations:</span>
              <span class="font-semibold text-sky-300">{{ getObservationCount(speciesId) }}</span>
            </div>

            <!-- Unlocked Traits -->
            <div class="flex flex-wrap gap-1">
              <span
                v-for="trait in getUnlockedTraits(speciesId)"
                :key="trait"
                class="px-2 py-0.5 rounded text-[0.65rem] font-medium uppercase tracking-wide"
                :class="getTraitBadgeClass(trait)"
              >
                {{ trait }}
              </span>
            </div>

            <!-- Fully Researched Badge -->
            <div v-if="isFullyResearched(speciesId)" class="absolute -top-2 -right-2">
              <span class="text-2xl drop-shadow-lg">⭐</span>
            </div>
          </div>
        </div>

        <!-- Selected Species Details -->
        <div v-if="selectedSpecies" class="mt-8 border-t border-slate-700/50 pt-6">
          <h3 class="text-xl font-semibold text-emerald-200 mb-4">{{ getSpeciesName(selectedSpecies) }} - Details</h3>

          <!-- Discovery Info -->
          <div class="sci-panel bg-slate-900/60 p-4 mb-4">
            <h4 class="text-sm font-semibold text-sky-200 mb-2">Discovery Information</h4>
            <div class="grid grid-cols-2 gap-3 text-sm text-slate-300/90">
              <div>
                <span class="text-slate-400 text-xs">Discovered:</span>
                <div class="font-semibold">{{ getDiscoveryInfo(selectedSpecies) }}</div>
              </div>
              <div>
                <span class="text-slate-400 text-xs">Observations:</span>
                <div class="font-semibold">{{ getObservationCount(selectedSpecies) }}</div>
              </div>
            </div>
          </div>

          <!-- Trait Categories -->
          <div class="space-y-3">
            <TraitCard
              title="Basic Information"
              icon="📋"
              :unlocked="hasUnlockedTrait(selectedSpecies, 'BASIC')"
              :required-observations="0"
            >
              <p class="text-sm text-slate-300/80">Species name, visual appearance, and basic classification.</p>
            </TraitCard>

            <TraitCard
              title="Environmental Requirements"
              icon="🌡️"
              :unlocked="hasUnlockedTrait(selectedSpecies, 'ENVIRONMENTAL')"
              :required-observations="10"
              :current-observations="getObservationCount(selectedSpecies)"
            >
              <p class="text-sm text-slate-300/80">Temperature, moisture, light requirements, and soil preferences.</p>
            </TraitCard>

            <TraitCard
              title="Reproductive Characteristics"
              icon="🌸"
              :unlocked="hasUnlockedTrait(selectedSpecies, 'REPRODUCTIVE')"
              :required-observations="25"
              :current-observations="getObservationCount(selectedSpecies)"
            >
              <p class="text-sm text-slate-300/80">Pollination type, seed dispersal mechanisms, and reproductive cycles.</p>
            </TraitCard>

            <TraitCard
              title="Ecological Interactions"
              icon="🔗"
              :unlocked="hasUnlockedTrait(selectedSpecies, 'ECOLOGICAL')"
              :required-observations="50"
              :current-observations="getObservationCount(selectedSpecies)"
            >
              <p class="text-sm text-slate-300/80">Succession stage, species interactions, and ecosystem role.</p>
            </TraitCard>

            <TraitCard
              title="Genetic Traits"
              icon="🧬"
              :unlocked="hasUnlockedTrait(selectedSpecies, 'GENETIC')"
              :required-observations="100"
              :current-observations="getObservationCount(selectedSpecies)"
            >
              <p class="text-sm text-slate-300/80">Mutation potential, adaptation mechanisms, and genetic diversity.</p>
            </TraitCard>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="sci-modal-footer bg-gradient-to-t from-slate-950/80 to-transparent flex-shrink-0">
        <button
          class="sci-btn border-slate-600/60 bg-slate-900/70 text-slate-200 hover:border-slate-500 hover:bg-slate-800/70"
          @click="$emit('close')"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useResearchStore } from '@/stores/researchStore';
import { TraitCategory } from '@/simulation/ResearchSystem';
import TraitCard from './TraitCard.vue';

const props = defineProps<{
  show: boolean;
  totalSpecies?: number;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const researchStore = useResearchStore();
const selectedSpecies = ref<string | null>(null);

// Computed properties
const discoveredSpeciesIds = computed(() => researchStore.discoveredSpeciesIds);
const discoveredCount = computed(() => researchStore.discoveredCount);
const discoveryPercentage = computed(() => {
  const total = props.totalSpecies || 50; // Default to 50 if not provided
  return Math.round((discoveredCount.value / total) * 100);
});

// Functions
function selectSpecies(speciesId: string) {
  selectedSpecies.value = speciesId;
}

function getSpeciesName(speciesId: string): string {
  // Convert species ID to readable name
  return speciesId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getResearchProgress(speciesId: string): number {
  return researchStore.getResearchProgress(speciesId);
}

function getObservationCount(speciesId: string): number {
  return researchStore.getObservationCount(speciesId);
}

function hasUnlockedTrait(speciesId: string, category: string): boolean {
  return researchStore.hasUnlockedTrait(speciesId, category as TraitCategory);
}

function isFullyResearched(speciesId: string): boolean {
  return getResearchProgress(speciesId) === 1.0;
}

function getUnlockedTraits(speciesId: string): string[] {
  const traits: string[] = [];
  if (hasUnlockedTrait(speciesId, 'BASIC')) traits.push('Basic');
  if (hasUnlockedTrait(speciesId, 'ENVIRONMENTAL')) traits.push('Environmental');
  if (hasUnlockedTrait(speciesId, 'REPRODUCTIVE')) traits.push('Reproductive');
  if (hasUnlockedTrait(speciesId, 'ECOLOGICAL')) traits.push('Ecological');
  if (hasUnlockedTrait(speciesId, 'GENETIC')) traits.push('Genetic');
  return traits;
}

function getTraitBadgeClass(trait: string): string {
  switch (trait.toLowerCase()) {
    case 'basic':
      return 'bg-slate-700/60 text-slate-200';
    case 'environmental':
      return 'bg-sky-700/60 text-sky-200';
    case 'reproductive':
      return 'bg-pink-700/60 text-pink-200';
    case 'ecological':
      return 'bg-emerald-700/60 text-emerald-200';
    case 'genetic':
      return 'bg-purple-700/60 text-purple-200';
    default:
      return 'bg-slate-700/60 text-slate-200';
  }
}

function getDiscoveryInfo(speciesId: string): string {
  const discovery = researchStore.getDiscovery(speciesId);
  if (!discovery) return 'Unknown';
  return discovery.discoveryConditions;
}
</script>
