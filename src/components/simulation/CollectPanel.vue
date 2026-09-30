<template>
  <Modal :show="show" title="Collect seeds" size="lg" @close="$emit('close')">
    <form class="flex min-h-0 flex-1 flex-col" @submit.prevent="$emit('collect', [...chosen])">
      <p class="nv-small nv-muted mt-1 pl-5">Choose the plants to take seed from. Seed carries its parent's traits; seed taken before it is fully ripe often fails.</p>
      <ul class="mt-3 grid min-h-0 flex-1 gap-1 overflow-y-auto pr-1">
        <li v-if="ripe.length === 0" class="nv-small nv-muted">Nothing is ripe here yet.</li>
        <li v-for="plant in ripe" :key="plant.id">
          <label class="nv-panel flex cursor-pointer items-start gap-2 p-2">
            <input v-model="chosen" type="checkbox" :value="plant.id" class="mt-1" />
            <span>
              <span class="font-bold">{{ plant.title }}</span>
              <span class="nv-small nv-muted"> · {{ plant.ripeness }}</span>
              <span class="nv-small block">{{ plant.traits }}</span>
            </span>
          </label>
        </li>
      </ul>
      <div class="mt-3 flex justify-end gap-2">
        <button type="submit" class="nv-btn" :disabled="chosen.length === 0">Collect from {{ chosen.length }} {{ chosen.length === 1 ? 'plant' : 'plants' }}</button>
      </div>
    </form>
  </Modal>
</template>

<script setup lang="ts">
import Modal from './Modal.vue'
import { computed, ref, watch } from 'vue'
import { plantTitle, type Tag } from '@/game/journal'
import { isRipe, ripeness, traitLine } from '@/game/traits'
import { speciesInfo } from '@/game/speciesInfo'

interface Plant {
  id: string
  speciesId: string
  age: number
  ageDays?: number
  phenologyStage?: string
  reproductiveOutput: number
  genetics?: { traits?: Record<string, number> }
}

const props = defineProps<{ show: boolean; plants: Plant[]; tags: Readonly<Record<string, Tag>> }>()
defineEmits<{ close: []; collect: [instanceIds: string[]] }>()

const chosen = ref<string[]>([])
watch(() => props.show, () => { chosen.value = [] })

// Ripe plants by species, ripest first, each described as the player would see it.
const ripe = computed(() =>
  props.plants
    .filter(plant => isRipe(plant))
    .sort((a, b) => a.speciesId.localeCompare(b.speciesId) || b.reproductiveOutput - a.reproductiveOutput)
    .map(plant => ({
      id: plant.id,
      title: plantTitle(plant, speciesInfo(plant.speciesId).name, props.tags[plant.id]),
      ripeness: ripeness(plant.reproductiveOutput),
      traits: traitLine(plant.genetics?.traits),
    }))
)
</script>
