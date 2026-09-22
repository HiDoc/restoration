<template>
  <div
    class="sci-panel p-4 transition-all"
    :class="[
      unlocked
        ? 'bg-emerald-950/30 border-emerald-500/40'
        : 'bg-slate-900/40 border-slate-700/40 opacity-60'
    ]"
  >
    <div class="flex items-center justify-between mb-2">
      <h5 class="text-sm font-semibold flex items-center gap-2" :class="unlocked ? 'text-emerald-200' : 'text-slate-400'">
        <span>{{ icon }}</span>
        <span>{{ title }}</span>
      </h5>
      <span v-if="unlocked" class="text-xs text-emerald-300 font-semibold">✓ Unlocked</span>
      <span v-else class="text-xs text-slate-500">
        {{ currentObservations }} / {{ requiredObservations }} observations
      </span>
    </div>
    <slot v-if="unlocked" />
    <p v-else class="text-sm text-slate-500 italic">Observe this species {{ requiredObservations }} times to unlock</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  icon: string;
  unlocked: boolean;
  requiredObservations: number;
  currentObservations?: number;
}>();
</script>
