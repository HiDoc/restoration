<template>
  <div class="sci-panel p-4 mb-4">
    <div class="mb-4">
      <h3 class="text-primary-400 text-lg font-semibold mb-2">🌱 Seed Selection for Next Year</h3>
      <p class="text-gray-400 text-sm">Select the best common grass specimens to use as seeds for next year's cycle</p>
    </div>
    
    <div v-if="selectedSeed" class="mb-6">
      <h4 class="text-white text-sm font-medium mb-2">Current Selected Seed:</h4>
      <div class="bg-primary-950 border-l-4 border-primary-400 p-3 rounded">
        <div class="flex flex-col gap-1 mb-2">
          <span class="text-primary-400 text-xs font-bold">{{ selectedSeed.instance.id }}</span>
          <span class="text-secondary-400 text-xs font-bold">Adaptation: {{ (selectedSeed.adaptationScore * 100).toFixed(1) }}%</span>
        </div>
        <div v-if="selectedSeed.instance.genetics" class="text-xs">
          <div class="flex flex-wrap gap-1">
            <span v-for="[name, trait] in selectedSeed.instance.genetics.traits" :key="name" class="species-trait text-xs">
              {{ trait.name }}: {{ (trait.value * 100).toFixed(0) }}%
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="mb-6">
      <h4 class="text-white text-sm font-medium mb-2">Available Candidates ({{ candidates.length }} found):</h4>
      <div v-if="candidates.length > 0" class="max-h-80 overflow-y-auto sci-panel">
        <div 
          v-for="candidate in candidates.slice(0, 10)" 
          :key="candidate.instance.id"
          class="p-3 cursor-pointer transition-colors sci-panel"
          :class="selectedSeed?.instance.id === candidate.instance.id ? 'sci-panel-elevated' : ''"
          @click="selectSeed(candidate)"
        >
          <div class="flex flex-col gap-1 mb-2">
            <span class="text-primary-400 text-xs font-bold">{{ candidate.instance.id.substring(0, 20) }}...</span>
            <span class="text-gray-400 text-xs">Chunk: {{ candidate.chunkId }}</span>
            <span class="text-secondary-400 text-xs font-bold">Adaptation: {{ (candidate.adaptationScore * 100).toFixed(1) }}%</span>
            <span class="text-gray-400 text-xs">Health: {{ (candidate.instance.health * 100).toFixed(0) }}%</span>
            <span class="text-gray-400 text-xs">Size: {{ candidate.instance.biomass.toFixed(2) }}</span>
          </div>
          <div v-if="candidate.instance.genetics" class="text-xs">
            <div class="flex flex-wrap gap-1 mb-1">
              <span v-for="[name, trait] in candidate.instance.genetics.traits" :key="name" class="species-trait text-xs">
                {{ trait.name }}: {{ (trait.value * 100).toFixed(0) }}%
              </span>
            </div>
            <div class="text-gray-500 text-xs">Gen: {{ candidate.instance.genetics.generation }}</div>
          </div>
        </div>
      </div>
      <div v-else class="p-5 text-center text-gray-500 italic">
        No common grass specimens available for selection.
      </div>
    </div>

    <div class="flex gap-2">
      <button 
        class="sci-btn text-xs" 
        @click="refreshCandidates"
        :disabled="loading"
      >
        🔄 Refresh Candidates
      </button>
      <button 
        class="sci-btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed" 
        @click="confirmSelection"
        :disabled="!selectedSeed || loading"
      >
        ✅ Confirm Selection for Next Year
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { SpeciesInstance } from '@/simulation/WorldChunk'

interface SeedCandidate {
  instance: SpeciesInstance
  chunkId: string
  adaptationScore: number
}

const props = defineProps<{
  engine: any
}>()

const candidates = ref<SeedCandidate[]>([])
const selectedSeed = ref<SeedCandidate | null>(null)
const loading = ref(false)

const refreshCandidates = () => {
  if (!props.engine?.getAvailableSeeds) return
  
  loading.value = true
  try {
    const newCandidates = props.engine.getAvailableSeeds('common_grass')
    candidates.value = newCandidates
    
    // Auto-select the best candidate if none selected
    if (newCandidates.length > 0 && !selectedSeed.value) {
      selectedSeed.value = newCandidates[0]
    }
  } catch (error) {
    console.error('Failed to refresh candidates:', error)
  } finally {
    loading.value = false
  }
}

const selectSeed = (candidate: SeedCandidate) => {
  selectedSeed.value = candidate
}

const emit = defineEmits<{ selected: [id: string], failed: [] }>()

const confirmSelection = () => {
  if (!selectedSeed.value || !props.engine?.selectSeedForNextYear) return
  
  loading.value = true
  try {
    const success = props.engine.selectSeedForNextYear('common_grass', selectedSeed.value.instance.id)
    if (success) {
      emit('selected', selectedSeed.value.instance.id)
    } else {
      emit('failed')
    }
  } catch (error) {
    console.error('Failed to confirm selection:', error)
    emit('failed')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refreshCandidates()
})

// Expose refresh method for parent component
defineExpose({
  refreshCandidates
})
</script>
