<template>
  <div v-if="show && discovery" class="sci-modal-overlay" @click.self="$emit('close')">
    <div class="sci-modal max-w-2xl w-full border border-emerald-500/30 bg-gradient-to-br from-emerald-950/90 via-slate-950/80 to-slate-950/95 shadow-2xl sci-fade-in">
      <!-- Header -->
      <div class="sci-modal-header relative border-b border-emerald-400/25 bg-gradient-to-br from-emerald-900/40 via-slate-900/40 to-slate-950/60 px-8 py-10">
        <!-- Decorative elements -->
        <div class="pointer-events-none absolute -top-6 right-6 hidden h-40 w-40 sm:block" aria-hidden="true">
          <span class="absolute right-6 top-4 block h-28 w-28 rounded-full border border-emerald-200/40 blur-[0.5px]"></span>
          <span class="absolute bottom-6 right-0 block h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400/60 via-teal-400/40 to-lime-500/40 blur-[0.6px]"></span>
        </div>

        <div class="flex max-w-2xl flex-col gap-1">
          <span class="text-[0.7rem] uppercase tracking-[0.28em] text-emerald-200/80">New Discovery</span>
          <h2 class="sci-modal-title text-2xl flex items-center gap-2">
            🌿 Species Discovered!
          </h2>
          <h3 class="text-lg text-emerald-100/90 font-semibold mt-1">{{ speciesName }}</h3>
        </div>

        <p class="mt-4 max-w-2xl text-sm leading-relaxed text-slate-200/80">
          {{ discovery.discoveryConditions }}
        </p>

        <!-- Close button -->
        <button
          class="sci-btn-ghost absolute top-6 right-6 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/60 text-xl text-slate-200 transition-colors hover:bg-emerald-700/70 hover:text-white"
          @click="$emit('close')"
          title="Close modal"
        >
          ×
        </button>
      </div>

      <!-- Body -->
      <div class="sci-modal-body">
        <!-- Discovery Stats -->
        <div class="relative mb-6 overflow-hidden rounded-2xl">
          <div class="absolute inset-0 bg-gradient-to-r from-emerald-900/50 via-slate-900/70 to-teal-950/40 backdrop-blur" aria-hidden="true"></div>
          <div class="relative flex flex-wrap gap-6 px-6 py-6">
            <div class="flex min-w-[120px] flex-col gap-1">
              <span class="text-[0.65rem] uppercase tracking-[0.2em] text-slate-300/60">Discovery Method</span>
              <span class="text-lg font-semibold text-emerald-200/90">{{ discoveryMethodLabel }}</span>
            </div>
            <div class="flex min-w-[120px] flex-col gap-1">
              <span class="text-[0.65rem] uppercase tracking-[0.2em] text-slate-300/60">First Seen</span>
              <span class="text-lg font-semibold text-emerald-200/90">Tick {{ discovery.firstSeenTick }}</span>
            </div>
            <div v-if="discovery.chunkId" class="flex min-w-[120px] flex-col gap-1">
              <span class="text-[0.65rem] uppercase tracking-[0.2em] text-slate-300/60">Location</span>
              <span class="text-lg font-semibold text-emerald-200/90">{{ discovery.chunkId }}</span>
            </div>
          </div>
        </div>

        <!-- Discovery Type Badge -->
        <div class="mb-6">
          <span
            class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide"
            :class="discoveryBadgeClass"
          >
            {{ discoveryMethodLabel }}
          </span>
        </div>

        <!-- Educational Note -->
        <div class="rounded-lg border border-teal-500/20 bg-teal-950/30 p-4 mb-6">
          <div class="flex items-start gap-2">
            <span class="text-2xl">💡</span>
            <div>
              <h4 class="text-sm font-semibold text-teal-200/90 mb-1">Research Notes</h4>
              <p class="text-sm text-slate-300/80 leading-relaxed">
                This species has been added to your field guide. Observe it more to unlock detailed trait information.
              </p>
            </div>
          </div>
        </div>

        <!-- Research Progress Hint -->
        <div class="border-t border-slate-700/50 pt-4">
          <p class="text-xs text-slate-400/80 text-center">
            Continue observing this species to unlock:<br/>
            <span class="text-emerald-300/80 font-semibold">Environmental traits (10), Reproductive traits (25), Ecological traits (50), Genetic traits (100)</span>
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="sci-modal-footer bg-gradient-to-t from-slate-950/80 to-transparent">
        <button
          class="sci-btn border-slate-600/60 bg-slate-900/70 text-slate-200 hover:border-slate-500 hover:bg-slate-800/70"
          @click="$emit('close')"
        >
          Close
        </button>
        <button
          class="sci-btn border-emerald-500/60 bg-emerald-900/60 text-emerald-100 hover:border-emerald-400 hover:bg-emerald-800/70"
          @click="$emit('open-field-guide')"
        >
          📚 View in Field Guide
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SpeciesDiscovery } from '@/simulation/ResearchSystem';
import { DiscoveryMethod } from '@/simulation/ResearchSystem';

const props = defineProps<{
  show: boolean;
  discovery: SpeciesDiscovery | null;
  speciesName?: string;
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'open-field-guide'): void;
}>();

const discoveryMethodLabel = computed(() => {
  if (!props.discovery) return '';

  switch (props.discovery.unlockMethod) {
    case DiscoveryMethod.INITIAL:
      return 'Starting Species';
    case DiscoveryMethod.ENVIRONMENTAL:
      return 'Environmental';
    case DiscoveryMethod.SUCCESSION:
      return 'Succession';
    case DiscoveryMethod.INTERVENTION:
      return 'Introduced';
    case DiscoveryMethod.HYBRID:
      return 'Hybrid Creation';
    default:
      return 'Discovery';
  }
});

const discoveryBadgeClass = computed(() => {
  if (!props.discovery) return '';

  switch (props.discovery.unlockMethod) {
    case DiscoveryMethod.INITIAL:
      return 'bg-sky-900/60 text-sky-200 border border-sky-500/40';
    case DiscoveryMethod.ENVIRONMENTAL:
      return 'bg-emerald-900/60 text-emerald-200 border border-emerald-500/40';
    case DiscoveryMethod.SUCCESSION:
      return 'bg-amber-900/60 text-amber-200 border border-amber-500/40';
    case DiscoveryMethod.INTERVENTION:
      return 'bg-purple-900/60 text-purple-200 border border-purple-500/40';
    case DiscoveryMethod.HYBRID:
      return 'bg-pink-900/60 text-pink-200 border border-pink-500/40';
    default:
      return 'bg-slate-900/60 text-slate-200 border border-slate-500/40';
  }
});
</script>
