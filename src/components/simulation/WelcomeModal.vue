<template>
  <Modal :show="show" label="Welcome to EcoSim" size="lg" @close="$emit('close')">
    <header class="flex flex-col items-center text-center">
      <img :src="nv('logo')" alt="" class="h-20 w-auto" />
      <h2 class="nv-heading mt-2 text-2xl">Welcome to EcoSim</h2>
      <img :src="nv('divider')" alt="" class="mt-1 h-4 w-64 max-w-full" />
    </header>

    <p class="mt-3 text-center">A worn-out meadow, a pouch of seed and a notebook. Watch what lives here, sow what might, and bring the land back.</p>

    <ol class="mt-4 grid gap-2 sm:grid-cols-3">
      <li v-for="card in CARDS" :key="card.title" class="nv-panel p-3">
        <img :src="nv(card.icon)" alt="" class="h-8 w-8 object-contain" />
        <h3 class="mt-1 font-bold leading-tight">{{ card.title }}</h3>
        <p class="nv-small nv-muted mt-0.5">{{ card.text }}</p>
      </li>
    </ol>

    <footer class="mt-4 flex flex-wrap items-center justify-between gap-3">
      <button type="button" class="nv-link" @click="$emit('skip')">Just play, no hints</button>
      <button type="button" class="nv-btn px-5 py-2 text-sm font-bold" @click="$emit('start-tutorial')">Begin, with hints</button>
    </footer>
  </Modal>
</template>

<script setup lang="ts">
import Modal from './Modal.vue'
import { nv } from './nouveauAssets'

defineProps<{ show: boolean }>()
defineEmits<{ close: []; 'start-tutorial': []; skip: [] }>()

// The six workflow steps, two to a card.
const CARDS = [
  { icon: 'icon-observe', title: 'Explore and discover', text: 'Open a hex. Listen, sample the soil, follow a bee: your Codex fills with what you see happen.' },
  { icon: 'icon-plants', title: 'Plant and observe', text: 'Sow seed where it will thrive. Tag plants and follow their lives in your Journal.' },
  { icon: 'icon-restore', title: 'Hybridize and restore', text: 'Cross plants in flower. Bring back pollinators and birds until the land holds on its own.' },
]
</script>
