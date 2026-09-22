<template>
  <div class="flex flex-col h-full border border-purple-400/25 bg-gradient-to-br from-purple-950/70 via-slate-950/60 to-slate-950/75 shadow-lg overflow-hidden">
    <div class="flex-shrink-0 px-3 py-2 border-b border-purple-400/20">
      <h2 class="text-xs font-semibold uppercase tracking-wide text-purple-200 flex items-center gap-2">
        <span>🔬</span>
        Research
      </h2>
    </div>

    <div class="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2">
      <!-- Quick Stats -->
      <div class="grid grid-cols-2 gap-2 mb-3">
        <div class="rounded-lg bg-slate-900/60 p-2">
          <div class="text-[0.6rem] uppercase tracking-[0.2em] text-slate-400 mb-0.5">Discovered</div>
          <div class="text-xl font-bold text-emerald-300">{{ discoveredCount }}</div>
        </div>
        <div class="rounded-lg bg-slate-900/60 p-2">
          <div class="text-[0.6rem] uppercase tracking-[0.2em] text-slate-400 mb-0.5">Observations</div>
          <div class="text-xl font-bold text-sky-300">{{ totalObservations }}</div>
        </div>
      </div>

      <!-- Achievements -->
      <div class="mb-3">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-purple-300/80 mb-1.5 flex items-center gap-1">
          <span>🏆</span>
          Achievements
        </h3>

        <div v-if="unlockedAchievements.length === 0" class="text-center py-3">
          <span class="text-2xl">🔒</span>
          <p class="text-xs text-slate-400 mt-1">No achievements yet</p>
        </div>

        <div v-else class="space-y-1.5">
          <div
            v-for="achievement in unlockedAchievements.slice(0, 3)"
            :key="achievement.achievementId"
            class="rounded border border-amber-500/30 bg-gradient-to-r from-amber-950/40 to-slate-950/40 p-2 sci-slide-in"
          >
            <div class="flex items-start gap-1.5">
              <span class="text-base">🏅</span>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-semibold text-amber-200/90">Achievement!</div>
                <div class="text-[0.65rem] text-slate-300/80">T{{ achievement.unlockedAtTick }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Active Research Questions -->
      <div class="mb-3">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-purple-300/80 mb-1.5 flex items-center gap-1">
          <span>❓</span>
          Questions
        </h3>

        <div v-if="activeQuestions.length === 0" class="text-center py-2">
          <p class="text-xs text-slate-400">No active questions</p>
        </div>

        <div v-else class="space-y-1.5">
          <div
            v-for="question in activeQuestions.slice(0, 2)"
            :key="question.id"
            class="rounded border border-sky-500/30 bg-sky-950/30 p-2 cursor-pointer hover:bg-sky-950/50 transition-colors"
            @click="$emit('select-question', question)"
          >
            <div class="text-xs font-medium text-sky-200/90 mb-0.5">{{ question.question }}</div>
            <div class="text-[0.65rem] text-slate-400">
              Difficulty: {{ '⭐'.repeat(question.difficulty) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Action Button -->
      <div class="sticky bottom-0 pt-2 pb-1 bg-gradient-to-t from-slate-950/90 to-transparent">
        <button
          class="sci-btn w-full border-emerald-500/60 bg-emerald-900/60 text-emerald-100 hover:border-emerald-400 hover:bg-emerald-800/70 text-xs py-1.5"
          @click="$emit('open-field-guide')"
        >
          📚 Field Guide
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useResearchStore } from '@/stores/researchStore';
import type { ResearchQuestion } from '@/simulation/ResearchSystem';

defineEmits<{
  (e: 'open-field-guide'): void;
  (e: 'select-question', question: ResearchQuestion): void;
}>();

const researchStore = useResearchStore();

// Computed properties
const discoveredCount = computed(() => researchStore.discoveredCount);
const totalObservations = computed(() => researchStore.totalObservations);
const unlockedAchievements = computed(() => researchStore.unlockedAchievements);
const activeQuestions = computed(() => researchStore.activeQuestions);
</script>
