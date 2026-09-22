<template>
  <nav
    class="sci-panel flex flex-col gap-4 border border-emerald-400/20 bg-gradient-to-br from-emerald-950/75 via-slate-950/65 to-slate-950/75 p-4 text-slate-100 shadow-lg"
    aria-labelledby="workflow-heading"
  >
    <header class="flex items-center justify-between gap-2 text-emerald-100">
      <h2 id="workflow-heading" class="text-sm font-semibold uppercase tracking-wide">Guided Workflow</h2>
      <span class="text-xs text-primary-200/70">{{ isRunning ? 'Running' : 'Paused' }}</span>
    </header>

    <section class="grid gap-2">
      <header class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary-200/80">
        <span>1 · Observe</span>
      </header>
      <p class="text-[11px] text-primary-100/70">Review ecosystem status and select the layers you want to study.</p>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="option in observeOptions"
          :key="option.id"
          type="button"
          class="sci-btn sci-btn-sm flex-1 min-w-[6rem] justify-center border border-emerald-400/30 bg-slate-900/60 text-xs text-sky-100 transition-colors hover:border-emerald-400/60 hover:bg-emerald-800/40"
          :class="{ 'outline outline-2 outline-emerald-400/70 outline-offset-[-2px] !border-emerald-400/70 !text-white': vizMode === option.id }"
          @click="$emit('set-viz', option.id)"
        >
          {{ option.label }}
        </button>
      </div>
      <div class="flex flex-wrap gap-1.5 text-xs">
        <button type="button" class="sci-btn sci-btn-sm flex-1 min-w-[6rem] border border-emerald-400/30 bg-slate-900/60 text-sky-100 hover:border-emerald-400/60 hover:bg-emerald-800/40" @click="$emit('navigate', 'overview')">Overview</button>
        <button type="button" class="sci-btn sci-btn-sm flex-1 min-w-[6rem] border border-emerald-400/30 bg-slate-900/60 text-sky-100 hover:border-emerald-400/60 hover:bg-emerald-800/40" @click="$emit('navigate', 'species')">Population</button>
        <button type="button" class="sci-btn sci-btn-sm flex-1 min-w-[6rem] border border-emerald-400/30 bg-slate-900/60 text-sky-100 hover:border-emerald-400/60 hover:bg-emerald-800/40" @click="$emit('navigate', 'events')">Timeline</button>
      </div>
    </section>

    <section class="grid gap-2">
      <header class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary-200/80">
        <span>2 · Hypothesize</span>
      </header>
      <p class="text-[11px] text-primary-100/70">Identify goals or alerts that need attention, then focus the map history for comparison.</p>
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <button type="button" class="sci-btn sci-btn-sm flex-1 min-w-[6rem] border border-emerald-400/30 bg-slate-900/60 text-sky-100 hover:border-emerald-400/60 hover:bg-emerald-800/40" @click="$emit('navigate', 'goals')">Review Goals</button>
        <button
          v-if="historySize > 0"
          type="button"
          class="sci-btn sci-btn-sm flex-1 min-w-[6rem] border border-emerald-400/30 bg-slate-900/60 text-sky-100 hover:border-emerald-400/60 hover:bg-emerald-800/40"
          @click="$emit('jump-history', Math.max(0, historySize - 5))"
        >
          Jump Back
        </button>
        <button
          v-if="historySize > 0"
          type="button"
          class="sci-btn sci-btn-sm flex-1 min-w-[6rem] border border-emerald-400/30 bg-slate-900/60 text-sky-100 hover:border-emerald-400/60 hover:bg-emerald-800/40"
          @click="$emit('jump-history', historySize - 1)"
        >
          Latest Snapshot
        </button>
      </div>
    </section>

    <section class="grid gap-2">
      <header class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary-200/80">
        <span>3 · Test</span>
      </header>
      <p class="text-[11px] text-primary-100/70">Apply interventions or run forward to validate hypotheses.</p>
      <div class="flex flex-wrap gap-1.5 text-xs">
        <button type="button" class="sci-btn sci-btn-sm flex-1 min-w-[6rem] border border-emerald-400/30 bg-slate-900/60 text-sky-100 hover:border-emerald-400/60 hover:bg-emerald-800/40" @click="$emit('toggle-run')">{{ isRunning ? 'Pause Simulation' : 'Start Simulation' }}</button>
        <button type="button" class="sci-btn sci-btn-sm flex-1 min-w-[6rem] border border-emerald-400/30 bg-slate-900/60 text-sky-100 hover:border-emerald-400/60 hover:bg-emerald-800/40" @click="$emit('multi-step')">Advance 10 Ticks</button>
      </div>
      <div class="flex flex-wrap gap-1.5 text-xs">
        <button type="button" class="sci-btn sci-btn-sm flex-1 min-w-[6rem] border border-emerald-400/30 bg-slate-900/60 text-sky-100 hover:border-emerald-400/60 hover:bg-emerald-800/40" @click="$emit('apply-intervention', 'plant')">Plant Center</button>
        <button type="button" class="sci-btn sci-btn-sm flex-1 min-w-[6rem] border border-emerald-400/30 bg-slate-900/60 text-sky-100 hover:border-emerald-400/60 hover:bg-emerald-800/40" @click="$emit('apply-intervention', 'irrigate')">Irrigate Center</button>
        <button type="button" class="sci-btn sci-btn-sm flex-1 min-w-[6rem] border border-emerald-400/30 bg-slate-900/60 text-sky-100 hover:border-emerald-400/60 hover:bg-emerald-800/40" @click="$emit('apply-intervention', 'cleanse')">Cleanse Center</button>
      </div>
    </section>
  </nav>
</template>

<script setup lang="ts">
import { toRefs } from 'vue';
import type { VizMode } from './types';

type ObserveOption = {
  id: VizMode;
  label: string;
};

const props = withDefaults(defineProps<{
  isRunning: boolean;
  vizMode: VizMode;
  historySize: number;
}>(), {
  historySize: 0,
});

const { isRunning, vizMode, historySize } = toRefs(props);

const observeOptions: ObserveOption[] = [
  { id: 'vitality', label: 'Vitality' },
  { id: 'moisture', label: 'Moisture' },
  { id: 'pollution', label: 'Pollution' },
  { id: 'diversity', label: 'Diversity' },
  { id: 'succession', label: 'Succession' },
  { id: 'pollinators', label: 'Pollinators' },
];

defineEmits<{
  (e: 'set-viz', mode: VizMode): void;
  (e: 'navigate', section: string): void;
  (e: 'jump-history', index: number): void;
  (e: 'toggle-run'): void;
  (e: 'multi-step'): void;
  (e: 'apply-intervention', kind: 'plant' | 'irrigate' | 'cleanse'): void;
}>();
</script>
