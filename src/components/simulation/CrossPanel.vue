<template>
  <Modal :show="show" title="Cross-pollinate" size="xl" @close="$emit('close')">
    <form class="flex min-h-0 flex-1 flex-col" @submit.prevent="submit">
      <p class="nv-small nv-muted mt-1 pl-5">Carry pollen from one flowering plant to another. Plants of one species cross, and so do species of one genus.</p>
      <div class="mt-3 grid min-h-0 flex-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
        <fieldset v-for="side in sides" :key="side.key" class="grid content-start gap-1">
          <legend class="font-bold">{{ side.legend }}</legend>
          <p v-if="side.plants.length === 0" class="nv-small nv-muted">{{ side.empty }}</p>
          <label v-for="plant in side.plants" :key="plant.id" class="nv-panel flex cursor-pointer items-start gap-2 p-2">
            <input v-model="picked[side.key]" type="radio" :name="side.key" :value="plant.id" class="mt-1" />
            <span>
              <span class="font-bold">{{ plant.title }}</span>
              <span class="nv-small block">{{ plant.traits }}</span>
            </span>
          </label>
        </fieldset>
      </div>
      <fieldset v-if="picked.mother && picked.father" class="mt-3 border-t border-[#c9a227]/40 pt-2">
        <legend class="font-bold">Your prediction</legend>
        <p class="nv-small nv-muted">For each trait, will the seedlings fall below both parents, between them, or above both? The notebook will tell.</p>
        <div v-for="trait in TRAITS" :key="trait" class="nv-small mt-1 flex flex-wrap items-center justify-between gap-2">
          <span>{{ TRAIT_NAMES[trait] }}</span>
          <span class="flex gap-1" role="radiogroup" :aria-label="TRAIT_NAMES[trait]">
            <label v-for="guess in GUESSES" :key="guess" class="nv-btn cursor-pointer">
              <input v-model="prediction[trait]" type="radio" :name="trait" :value="guess" class="sr-only" />{{ guess }}
            </label>
          </span>
        </div>
      </fieldset>
      <div class="mt-3 flex justify-end">
        <button type="submit" class="nv-btn" :disabled="!picked.mother || !picked.father">Pollinate</button>
      </div>
    </form>
  </Modal>
</template>

<script setup lang="ts">
import Modal from './Modal.vue'
import { computed, reactive, watch } from 'vue'
import { plantTitle, type Tag } from '@/game/journal'
import { GUESSES, type Guess } from '@/game/notebook'
import { TRAIT_NAMES, TRAITS, traitLine } from '@/game/traits'
import { crossBarrier } from '@/game/hybrids'
import { speciesInfo } from '@/game/speciesInfo'
import { SpeciesRegistry } from '@/simulation/SpeciesRegistry'

interface Plant {
  id: string
  speciesId: string
  age: number
  ageDays?: number
  phenologyStage?: string
  pollen?: unknown
  genetics?: { traits?: Record<string, number> }
}

const props = defineProps<{ show: boolean; plants: Plant[]; tags: Readonly<Record<string, Tag>> }>()
const emit = defineEmits<{ close: []; cross: [data: { mother: string; father: string; prediction: Partial<Record<string, Guess>> }] }>()

const picked = reactive({ mother: '', father: '' })
const prediction = reactive<Partial<Record<string, Guess>>>({})
watch(() => props.show, () => {
  picked.mother = picked.father = ''
  for (const trait of TRAITS) delete prediction[trait]
})

const describe = (plant: Plant) => ({
  id: plant.id,
  title: plantTitle(plant, speciesInfo(plant.speciesId).name, props.tags[plant.id]),
  traits: traitLine(plant.genetics?.traits),
})
const flowering = computed(() => props.plants.filter(plant => plant.phenologyStage === 'flowering'))
const mother = computed(() => flowering.value.find(plant => plant.id === picked.mother))
// Fathers that can cross with the chosen mother; before one is chosen, every other flowering plant.
const sides = computed(() => {
  const registry = SpeciesRegistry.getInstance()
  const mothers = flowering.value.filter(plant => !plant.pollen)
  const fathers = flowering.value.filter(plant =>
    plant.id !== picked.mother && (!mother.value || !crossBarrier(registry.getSpecies(mother.value.speciesId), registry.getSpecies(plant.speciesId))),
  )
  return [
    { key: 'mother' as const, legend: 'Seed from', plants: mothers.map(describe), empty: 'Every flower here has already been pollinated by hand.' },
    { key: 'father' as const, legend: 'Pollen from', plants: fathers.map(describe), empty: 'Nothing flowering here can cross with it.' },
  ]
})
watch(() => picked.mother, () => {
  if (!sides.value[1].plants.some(plant => plant.id === picked.father)) picked.father = ''
})

function submit() {
  emit('cross', { mother: picked.mother, father: picked.father, prediction: { ...prediction } })
}
</script>
