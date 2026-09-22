<template>
  <div class="flex flex-col h-full border border-purple-500/25 bg-gradient-to-br from-purple-950/70 via-slate-950/60 to-slate-950/75 shadow-lg overflow-hidden">
    <div class="flex-shrink-0 px-3 py-2 border-b border-purple-500/20">
      <h2 class="text-xs font-semibold uppercase tracking-wide text-purple-200 flex items-center gap-2">
        <span>🧬</span>
        Hybridization
      </h2>
    </div>

    <div class="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2">
      <!-- Quick Stats -->
      <div class="grid grid-cols-2 gap-2 mb-3">
        <div class="rounded-lg bg-slate-900/60 p-2">
          <div class="text-[0.6rem] uppercase tracking-[0.2em] text-slate-400 mb-0.5">Hybrids</div>
          <div class="text-xl font-bold text-purple-300">{{ stats.totalHybrids }}</div>
        </div>
        <div class="rounded-lg bg-slate-900/60 p-2">
          <div class="text-[0.6rem] uppercase tracking-[0.2em] text-slate-400 mb-0.5">Max Gen</div>
          <div class="text-xl font-bold text-amber-300">{{ stats.maxGeneration }}</div>
        </div>
      </div>

      <!-- Recent Hybrids -->
      <div class="mb-3">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-purple-300/80 mb-1.5 flex items-center gap-1">
          <span>🌟</span>
          Recent Hybrids
        </h3>

        <div v-if="recentHybrids.length === 0" class="text-center py-3">
          <span class="text-2xl">🔬</span>
          <p class="text-xs text-slate-400 mt-1">No hybrids yet</p>
          <p class="text-[0.65rem] text-slate-500 mt-0.5">Plant diverse species together</p>
        </div>

        <div v-else class="space-y-1.5">
          <div
            v-for="hybrid in recentHybrids.slice(0, 4)"
            :key="hybrid.speciesId"
            class="rounded border border-purple-500/30 bg-gradient-to-r from-purple-950/40 to-slate-950/40 p-2 sci-slide-in cursor-pointer hover:border-purple-400/50"
            @click="$emit('view-hybrid', hybrid.speciesId)"
          >
            <div class="flex items-start gap-1.5">
              <span class="text-base">🧬</span>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-semibold text-purple-200/90 truncate">
                  {{ hybrid.speciesName }}
                </div>
                <div class="text-[0.65rem] text-slate-400 mt-0.5">
                  Gen {{ hybrid.generation }} • Tick {{ hybrid.created }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Compatibility Guide -->
      <div class="mb-3">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-purple-300/80 mb-1.5 flex items-center gap-1">
          <span>📊</span>
          Compatibility
        </h3>

        <div class="bg-slate-900/40 rounded p-2 text-[0.65rem] leading-relaxed text-slate-300">
          <div class="mb-1.5">
            <span class="text-emerald-400">●</span> Same category: High
          </div>
          <div class="mb-1.5">
            <span class="text-amber-400">●</span> Related: Medium
          </div>
          <div>
            <span class="text-red-400">●</span> Distant: Low
          </div>
        </div>
      </div>

      <!-- Success Rate -->
      <div class="mb-3" v-if="stats.totalEvents > 0">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-purple-300/80 mb-1.5">
          Success Rate
        </h3>
        <div class="bg-slate-900/60 rounded p-2">
          <div class="flex justify-between items-center mb-1">
            <span class="text-xs text-slate-300">{{ stats.successfulEvents }} / {{ stats.totalEvents }}</span>
            <span class="text-xs font-bold text-emerald-300">
              {{ ((stats.successfulEvents / stats.totalEvents) * 100).toFixed(0) }}%
            </span>
          </div>
          <div class="w-full bg-slate-800 rounded-full h-1.5">
            <div
              class="bg-gradient-to-r from-purple-500 to-emerald-500 h-1.5 rounded-full transition-all"
              :style="{ width: ((stats.successfulEvents / stats.totalEvents) * 100) + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Action Button -->
      <div class="sticky bottom-0 pt-2 pb-1 bg-gradient-to-t from-slate-950/90 to-transparent">
        <button
          class="sci-btn w-full border-purple-500/60 bg-purple-900/60 text-purple-100 hover:border-purple-400 hover:bg-purple-800/70 text-xs py-1.5"
          @click="$emit('open-tree')"
        >
          🌳 View Full Tree
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { HybridLineage } from '@/simulation/HybridizationSystem';

const props = defineProps<{
  lineages: Map<string, HybridLineage>;
  stats: {
    totalHybrids: number;
    totalEvents: number;
    successfulEvents: number;
    averageGeneration: number;
    maxGeneration: number;
  };
}>();

defineEmits<{
  (e: 'open-tree'): void;
  (e: 'view-hybrid', speciesId: string): void;
}>();

// Get recent hybrids (sorted by creation time)
const recentHybrids = computed(() => {
  return Array.from(props.lineages.values())
    .filter(l => l.isHybrid)
    .sort((a, b) => b.created - a.created);
});
</script>
