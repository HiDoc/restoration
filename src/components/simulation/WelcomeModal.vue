<script setup lang="ts">
import { nv } from './nouveauAssets';

defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'start-tutorial'): void;
  (e: 'skip'): void;
}>();

const cards = [
  { icon: 'icon-observe', title: 'Observe Species Ecology', text: 'Watch species adapt, reproduce, and interact based on environmental conditions.' },
  { icon: 'icon-diversity', title: 'Complete Ecosystem Goals', text: 'Achieve biodiversity, health, and research objectives to receive new seeds.' },
  { icon: 'icon-modify', title: 'Use Interventions Wisely', text: 'Collect seed from ripe plants, sow it where it will thrive, water and clean the land.' },
  { icon: 'icon-journal', title: 'Discover New Species', text: 'Research species to unlock traits and understand ecological relationships.' },
];

function startTutorial() {
  emit('start-tutorial');
}

function skipTutorial() {
  emit('skip');
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sci-fade">
      <div
        v-if="show"
        class="nouveau fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        style="background: rgba(8, 20, 13, 0.75)"
        @click.self="skipTutorial"
      >
        <div class="sci-modal nv-ornate max-h-full w-full max-w-2xl overflow-y-auto" role="dialog" aria-labelledby="welcome-title" @click.stop>
          <header class="flex flex-col items-center text-center">
            <img :src="nv('logo')" alt="" class="h-24 w-auto" />
            <h2 id="welcome-title" class="nv-heading mt-2 text-2xl">Welcome to EcoSim</h2>
            <p class="nv-small nv-muted uppercase tracking-[0.25em]">An ecological simulation game</p>
            <img :src="nv('divider')" alt="" class="mt-2 h-4 w-64 max-w-full" />
          </header>

          <p class="mt-3 text-center">
            Welcome, ecologist! You're about to manage a living ecosystem where every species,
            every environmental change, and every decision matters.
          </p>

          <ul class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <li v-for="card in cards" :key="card.title" class="nv-step !pl-3">
              <img :src="nv(card.icon)" alt="" class="h-9 w-9 flex-shrink-0 object-contain" />
              <div>
                <h3 class="font-bold leading-tight">{{ card.title }}</h3>
                <p class="nv-small nv-muted">{{ card.text }}</p>
              </div>
            </li>
          </ul>

          <div class="nv-panel mt-3 flex gap-3 p-3">
            <img :src="nv('icon-test')" alt="" class="h-8 w-8 flex-shrink-0 object-contain" />
            <p class="nv-small">
              <strong>Scientific accuracy.</strong> EcoSim simulates real ecological principles: species have environmental tolerances,
              reproduction depends on conditions, and ecosystems evolve through natural succession.
              Your interventions create ripple effects, so choose carefully.
            </p>
          </div>

          <footer class="mt-4 flex items-center justify-between gap-4">
            <button type="button" class="nv-link" @click="skipTutorial">Skip Tutorial</button>
            <button type="button" class="nv-btn px-5 py-2 text-sm font-bold" @click="startTutorial">Start Tutorial</button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Fade transition for modal */
.sci-fade-enter-active,
.sci-fade-leave-active {
  transition: opacity 0.3s ease;
}

.sci-fade-enter-from,
.sci-fade-leave-to {
  opacity: 0;
}

/* Modal animation */
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
