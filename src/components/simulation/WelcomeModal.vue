<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'start-tutorial'): void;
  (e: 'skip'): void;
}>();

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
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        @click.self="skipTutorial"
      >
        <div
          class="sci-modal max-w-2xl w-full bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 border-2 border-emerald-400/30 rounded-xl shadow-2xl overflow-hidden"
          @click.stop
        >
          <!-- Decorative header gradient -->
          <div class="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"></div>

          <!-- Modal header -->
          <div class="sci-modal-header px-6 py-4 border-b border-emerald-400/20">
            <h2 class="text-2xl font-bold text-emerald-100">
              Welcome to EcoSim
            </h2>
            <p class="text-sm text-slate-400 mt-1">
              An Ecological Simulation Game
            </p>
          </div>

          <!-- Modal body -->
          <div class="sci-modal-body px-6 py-6 space-y-6">
            <!-- Introduction -->
            <div class="text-slate-300 leading-relaxed">
              <p class="text-base">
                Welcome, ecologist! You're about to manage a living ecosystem where every species,
                every environmental change, and every decision matters.
              </p>
            </div>

            <!-- Core mechanics -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-slate-800/50 border border-emerald-500/20 rounded-lg p-4">
                <div class="text-3xl mb-2">🌱</div>
                <h3 class="text-sm font-semibold text-emerald-300 mb-1">Observe Species Ecology</h3>
                <p class="text-xs text-slate-400">
                  Watch species adapt, reproduce, and interact based on environmental conditions
                </p>
              </div>

              <div class="bg-slate-800/50 border border-amber-500/20 rounded-lg p-4">
                <div class="text-3xl mb-2">🎯</div>
                <h3 class="text-sm font-semibold text-amber-300 mb-1">Complete Ecosystem Goals</h3>
                <p class="text-xs text-slate-400">
                  Achieve biodiversity, health, and research objectives to earn points
                </p>
              </div>

              <div class="bg-slate-800/50 border border-purple-500/20 rounded-lg p-4">
                <div class="text-3xl mb-2">🔧</div>
                <h3 class="text-sm font-semibold text-purple-300 mb-1">Use Interventions Wisely</h3>
                <p class="text-xs text-slate-400">
                  Plant species, irrigate land, and cleanse pollution—but manage your resources
                </p>
              </div>

              <div class="bg-slate-800/50 border border-blue-500/20 rounded-lg p-4">
                <div class="text-3xl mb-2">📚</div>
                <h3 class="text-sm font-semibold text-blue-300 mb-1">Discover New Species</h3>
                <p class="text-xs text-slate-400">
                  Research species to unlock traits and understand ecological relationships
                </p>
              </div>
            </div>

            <!-- Key concepts -->
            <div class="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
              <h3 class="text-sm font-semibold text-emerald-300 mb-2">🧪 Scientific Accuracy</h3>
              <p class="text-xs text-slate-400 leading-relaxed">
                EcoSim simulates real ecological principles: species have environmental tolerances,
                reproduction depends on conditions, and ecosystems evolve through natural succession.
                Your interventions create ripple effects—choose carefully!
              </p>
            </div>
          </div>

          <!-- Modal footer -->
          <div class="sci-modal-footer px-6 py-4 bg-slate-900/50 border-t border-slate-700/50 flex items-center justify-between gap-4">
            <button
              @click="skipTutorial"
              class="px-4 py-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
            >
              Skip Tutorial
            </button>

            <button
              @click="startTutorial"
              class="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 hover:shadow-emerald-500/30"
            >
              Start Tutorial
            </button>
          </div>
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
