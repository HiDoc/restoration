<template>
  <section class="sci-panel space-y-3 border border-emerald-400/20 bg-gradient-to-br from-emerald-950/75 via-slate-950/65 to-slate-950/70 p-4 text-slate-100 shadow-lg">
    <div class="sci-header flex items-center justify-between -m-1 p-1 mb-2 text-emerald-100">
      <span class="font-semibold">Goals</span>
      <span class="text-xs text-slate-300/80">Difficulty: {{ difficultyLabel }}</span>
    </div>
    <div class="flex items-center justify-between text-xs">
      <span class="text-slate-300/80">Points</span>
      <span class="font-mono text-emerald-200/90">{{ points }}</span>
    </div>
    <div class="space-y-2">
      <div
        v-for="g in goals"
        :key="g.id"
        class="rounded border border-emerald-400/25 bg-gradient-to-br from-emerald-900/40 via-slate-900/50 to-slate-950/60 p-3"
      >
        <div class="mb-1 flex items-center justify-between text-xs">
          <span class="text-slate-100">{{ g.title }}</span>
          <span :class="g.completed ? 'text-emerald-300' : 'text-slate-400'">
            {{ g.formatted }}
          </span>
        </div>
        <div class="h-1.5 w-full overflow-hidden rounded bg-slate-800/60">
          <div
            class="h-full rounded bg-gradient-to-r from-emerald-400 via-lime-400 to-sky-400 transition-all duration-300"
            :style="{ width: Math.round(Math.min(1, g.progress) * 100) + '%' }"
          ></div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface GoalVM {
  id: string
  title: string
  progress: number
  formatted: string
  completed: boolean
}
const props = defineProps<{ goals: GoalVM[]; points: number; difficulty: 'easy'|'normal'|'hard' }>()
const difficultyLabel = computed(() => props.difficulty[0].toUpperCase() + props.difficulty.slice(1))
</script>
