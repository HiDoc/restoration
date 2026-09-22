<template>
  <div v-if="show" class="sci-modal-overlay" @click.self="closeModal">
    <div class="sci-modal max-w-4xl w-full max-h-screen-90 overflow-y-auto border border-sky-500/25 bg-gradient-to-br from-emerald-950/85 via-slate-950/70 to-slate-950 shadow-2xl">
      <div class="sci-modal-header relative border-b border-emerald-400/25 bg-gradient-to-br from-emerald-900/40 via-slate-900/40 to-slate-950/60 px-8 py-10 text-slate-100">
        <div class="pointer-events-none absolute -top-6 right-6 hidden h-40 w-40 sm:block" aria-hidden="true">
          <span class="absolute right-6 top-4 block h-28 w-28 rounded-full border border-emerald-200/40 blur-[0.5px]"></span>
          <span class="absolute bottom-6 right-0 block h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400/60 via-teal-400/40 to-sky-500/40 blur-[0.6px]"></span>
        </div>
        <div class="flex max-w-3xl flex-col gap-1">
          <span class="text-[0.7rem] uppercase tracking-[0.28em] text-emerald-200/80">New Season Unlocked</span>
          <h2 class="sci-modal-title text-2xl">🎯 Year {{ year }} Complete!</h2>
          <h3 class="sci-modal-title text-base text-emerald-100/90">🌱 Prepare Seeds for Year {{ year + 1 }}</h3>
        </div>
        <p class="mt-4 max-w-3xl text-sm leading-relaxed text-slate-200/80">
          Curate the strongest specimens to shape the genetic story of the coming season. Their traits will
          steer how common grass responds to shifting climate, soil, and canopy conditions.
        </p>
        <button
          class="sci-btn-ghost absolute top-6 right-6 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/60 text-xl text-slate-200 transition-colors hover:bg-emerald-700/70 hover:text-white"
          @click="closeModal"
          title="Close modal"
        >
          ×
        </button>
      </div>

      <div class="sci-modal-body">
        <div class="relative mb-6 overflow-hidden rounded-2xl">
          <div class="absolute inset-0 bg-gradient-to-r from-emerald-900/50 via-slate-900/70 to-sky-950/40 backdrop-blur" aria-hidden="true"></div>
          <div class="relative flex flex-wrap gap-6 px-6 py-6">
            <div class="flex min-w-[120px] flex-col gap-1">
              <span class="text-[0.65rem] uppercase tracking-[0.2em] text-slate-300/60">Total Species</span>
              <span class="text-2xl font-semibold text-emerald-200/90">{{ totalSpecies }}</span>
            </div>
            <div class="flex min-w-[120px] flex-col gap-1">
              <span class="text-[0.65rem] uppercase tracking-[0.2em] text-slate-300/60">Ecosystem Vitality</span>
              <span class="text-2xl font-semibold text-emerald-200/90">{{ (avgVitality * 100).toFixed(1) }}%</span>
            </div>
            <div class="flex min-w-[120px] flex-col gap-1">
              <span class="text-[0.65rem] uppercase tracking-[0.2em] text-slate-300/60">Eligible Specimens</span>
              <span class="text-2xl font-semibold text-emerald-200/90">{{ candidates.length }}</span>
            </div>
          </div>
        </div>

        <div>
          <div class="flex flex-wrap items-center gap-3">
            <h4 class="text-lg font-semibold text-lime-200/90">🏆 Top Performing Specimens</h4>
            <span class="rounded-full border border-sky-400/40 bg-slate-900/60 px-3 py-1 text-[0.65rem] uppercase tracking-[0.16em] text-sky-200/80">Adaptation Score</span>
          </div>
          <p class="mb-4 text-sm text-slate-300/80">
            Each pick balances health, biomass, and habitat resonance. Mix leaders from different chunks to
            diversify the next season’s genome.
          </p>

          <div v-if="candidates.length > 0" class="grid grid-cols-1 gap-4 mb-5 md:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="(candidate, index) in topCandidates"
              :key="candidate.instance.id"
              class="sci-panel relative cursor-pointer bg-gradient-to-br from-slate-950/90 via-slate-950/80 to-slate-900/80 p-4 transition-all hover:-translate-y-1 hover:border-emerald-400/60 hover:shadow-emerald-500/30 md:p-5"
              :class="[
                selectedCandidate?.instance.id === candidate.instance.id
                  ? 'border border-emerald-400/80 ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950'
                  : 'border border-slate-700/60'
              ]"
              @click="selectCandidate(candidate)"
            >
              <div v-if="index < 3" class="absolute -top-2 right-2 text-xl drop-shadow-sm">
                {{ index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉' }}
              </div>
              <div>
                <div class="flex justify-between items-center mb-3">
                  <span class="font-bold">Specimen #{{ index + 1 }}</span>
                  <span class="font-bold text-base">{{ (candidate.adaptationScore * 100).toFixed(1) }}%</span>
                </div>

                <div class="mb-4 grid grid-cols-2 gap-3 text-[0.75rem] text-slate-300/80">
                  <div class="flex items-center justify-between gap-2">
                    <span>Health</span>
                    <span class="font-semibold text-slate-100/90">{{ (candidate.instance.health * 100).toFixed(0) }}%</span>
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <span>Biomass</span>
                    <span class="font-semibold text-slate-100/90">{{ candidate.instance.biomass.toFixed(2) }}</span>
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <span>Age</span>
                    <span class="font-semibold text-slate-100/90">{{ candidate.instance.age }}</span>
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <span>Chunk</span>
                    <span class="font-semibold text-slate-100/90">{{ candidate.chunkId.replace('chunk_', '') }}</span>
                  </div>
                </div>

                <div v-if="candidate.instance.genetics" class="pt-3">
                  <div class="mb-2 text-sm font-semibold text-emerald-200/90">🧬 Genetic Traits</div>
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

      <div class="sci-modal-footer flex justify-between items-center flex-wrap gap-4 border-t border-emerald-400/20 pt-6">
        <div v-if="selectedCandidate" class="text-sm text-cyan-200/80">
          Selected specimen tailored at {{ (selectedCandidate.adaptationScore * 100).toFixed(1) }}% adaptation strength
        </div>
        <div class="flex gap-3">
          <button
            v-if="candidates.length > 0"
            class="sci-btn text-sm border border-emerald-400/40 bg-slate-900/60 text-sky-100 transition-colors hover:border-emerald-400/70 hover:bg-emerald-800/50 hover:text-white"
            @click="selectBest"
          >
            🎯 Auto-Select Best
          </button>
          <button
            class="sci-btn text-sm border border-emerald-400/40 bg-slate-900/60 text-sky-100 transition-colors hover:border-emerald-400/70 hover:bg-emerald-800/50 hover:text-white"
            @click="skipSelection"
          >
            ⏭️ Skip Selection
          </button>
          <button
            class="sci-btn-primary text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            :class="selectedCandidate ? 'bg-gradient-to-r from-emerald-500 to-sky-500 text-slate-900 shadow-lg' : 'bg-emerald-900/60 text-emerald-200'"
            @click="confirmSelection"
            :disabled="!selectedCandidate"
          >
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
