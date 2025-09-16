<template>
  <div v-if="show" class="sci-modal-overlay" @click.self="closeModal">
    <div class="sci-modal max-w-4xl w-full max-h-screen-90 overflow-y-auto">
      <div class="sci-modal-header relative">
        <h2 class="sci-modal-title text-2xl">🎯 Year {{ year }} Complete!</h2>
        <h3 class="sci-modal-title text-base">🌱 Select Seeds for Year {{ year + 1 }}</h3>
        <p class="text-sm leading-relaxed opacity-80">
          Choose the best performing common grass specimens to use as seeds for the next growing season.
          This selection will determine the genetic traits of all new common grass in the coming year.
        </p>
        <button class="absolute top-4 right-5 sci-btn-ghost text-2xl w-8 h-8 flex items-center justify-center" @click="closeModal" title="Close modal">×</button>
      </div>

      <div class="sci-modal-body">
        <div class="mb-6 sci-panel p-4">
          <div class="flex gap-8 flex-wrap">
            <div class="flex flex-col gap-1">
              <span class="text-xs text-gray-500">Total Species:</span>
              <span class="text-lg font-bold text-primary-400">{{ totalSpecies }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs text-gray-500">Ecosystem Health:</span>
              <span class="text-lg font-bold text-primary-400">{{ (avgVitality * 100).toFixed(1) }}%</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs text-gray-500">Common Grass Found:</span>
              <span class="text-lg font-bold text-primary-400">{{ candidates.length }}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 class="sci-header-title text-base mb-2">🏆 Top Performing Specimens</h4>
          <p class="opacity-80 text-sm mb-4">
            Specimens are ranked by adaptation score. Higher scores indicate better environmental fitness.
          </p>
          
          <div v-if="candidates.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
            <div 
              v-for="(candidate, index) in topCandidates" 
              :key="candidate.instance.id"
              class="sci-panel p-4 cursor-pointer transition-all relative"
              :class="{
                'sci-panel-elevated': selectedCandidate?.instance.id === candidate.instance.id,
                'border-yellow-400': index === 0,
                'border-gray-400': index === 1,
                'border-amber-600': index === 2
              }"
              @click="selectCandidate(candidate)"
            >
              <div v-if="index < 3" class="absolute -top-2 right-2 text-xl">
                {{ index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉' }}
              </div>
              
              <div>
                <div class="flex justify-between items-center mb-3">
                  <span class="font-bold">Specimen #{{ index + 1 }}</span>
                  <span class="font-bold text-base">{{ (candidate.adaptationScore * 100).toFixed(1) }}%</span>
                </div>
                
                <div class="grid grid-cols-2 gap-2 mb-4">
                  <div class="flex justify-between text-xs">
                    <span class="opacity-70">Health:</span>
                    <span class="font-bold">{{ (candidate.instance.health * 100).toFixed(0) }}%</span>
                  </div>
                  <div class="flex justify-between text-xs">
                    <span class="opacity-70">Size:</span>
                    <span class="font-bold">{{ candidate.instance.biomass.toFixed(2) }}</span>
                  </div>
                  <div class="flex justify-between text-xs">
                    <span class="opacity-70">Age:</span>
                    <span class="font-bold">{{ candidate.instance.age }}</span>
                  </div>
                  <div class="flex justify-between text-xs">
                    <span class="opacity-70">Location:</span>
                    <span class="font-bold">{{ candidate.chunkId.replace('chunk_', '') }}</span>
                  </div>
                </div>

                <div v-if="candidate.instance.genetics" class="pt-3">
                  <div class="text-sm text-primary-400 mb-2">🧬 Genetic Traits</div>
                  <div class="flex flex-col gap-2">
                    <div 
                      v-for="[name, trait] in candidate.instance.genetics.traits" 
                      :key="name" 
                      class="grid grid-cols-3 gap-2 items-center text-xs"
                    >
                      <span class="truncate">{{ trait.name }}</span>
                      <div class="sci-progress">
                        <div 
                          class="sci-progress-bar transition-all duration-300"
                          :style="{ width: (trait.value * 100) + '%' }"
                          :class="trait.value > 0.7 ? 'bg-primary-400' : trait.value > 0.4 ? 'bg-secondary-400' : 'bg-gray-400'"
                        ></div>
                      </div>
                      <span class="text-right">{{ (trait.value * 100).toFixed(0) }}%</span>
                    </div>
                  </div>
                  <div class="text-xs opacity-70 mt-2">Generation: {{ candidate.instance.genetics.generation }}</div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-10 opacity-80">
            <p class="mb-2">⚠️ No common grass specimens found for selection.</p>
            <p>New specimens will be generated with default genetics.</p>
          </div>
        </div>
      </div>

      <div class="sci-modal-footer flex justify-between items-center flex-wrap gap-4">
        <div v-if="selectedCandidate" class="text-sm">
          Selected: Specimen with {{ (selectedCandidate.adaptationScore * 100).toFixed(1) }}% adaptation score
        </div>
        <div class="flex gap-3">
          <button v-if="candidates.length > 0" class="sci-btn text-sm" @click="selectBest">
            🎯 Auto-Select Best
          </button>
          <button class="sci-btn text-sm" @click="skipSelection">
            ⏭️ Skip Selection
          </button>
          <button class="sci-btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed" @click="confirmSelection" :disabled="!selectedCandidate">
            ✅ Confirm for Year {{ year + 1 }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { SpeciesInstance } from '@/simulation/WorldChunk'

interface SeedCandidate {
  instance: SpeciesInstance
  chunkId: string
  adaptationScore: number
}

const props = defineProps<{
  show: boolean
  year: number
  engine: any
  totalSpecies: number
  avgVitality: number
}>()

const emit = defineEmits<{
  close: []
  confirm: [candidateId: string | null]
}>()

const candidates = ref<SeedCandidate[]>([])
const selectedCandidate = ref<SeedCandidate | null>(null)

// Top 6 candidates for display
const topCandidates = computed(() => candidates.value.slice(0, 6))

const loadCandidates = () => {
  if (!props.engine?.getAvailableSeeds) return
  
  try {
    const newCandidates = props.engine.getAvailableSeeds('common_grass')
    candidates.value = newCandidates
    
    // Auto-select the best candidate
    if (newCandidates.length > 0) {
      selectedCandidate.value = newCandidates[0]
    }
  } catch (error) {
    console.error('Failed to load candidates:', error)
    candidates.value = []
  }
}

const selectCandidate = (candidate: SeedCandidate) => {
  selectedCandidate.value = candidate
}

const selectBest = () => {
  if (candidates.value.length > 0) {
    selectedCandidate.value = candidates.value[0]
  }
}

const confirmSelection = () => {
  if (!selectedCandidate.value) return
  
  try {
    const success = props.engine?.selectSeedForNextYear?.('common_grass', selectedCandidate.value.instance.id)
    if (success) {
      emit('confirm', selectedCandidate.value.instance.id)
    } else {
      // Fall back silently; parent can notify via event log
      emit('confirm', null)
    }
  } catch (error) {
    console.error('Failed to confirm selection:', error)
    emit('confirm', null)
  }
}

const skipSelection = () => {
  emit('confirm', null)
}

const closeModal = () => {
  emit('close')
}

// Load candidates when modal is shown
watch(() => props.show, (show) => {
  if (show) {
    loadCandidates()
  }
})
</script>
