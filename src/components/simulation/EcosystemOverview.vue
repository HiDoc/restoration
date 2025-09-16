<template>
  <section class="sci-panel p-4">
    <div class="flex items-center justify-between pb-3 border-b border-border mb-4">
      <h2 class="text-xl font-semibold tracking-wide text-accent">Ecosystem Overview</h2>
      <div class="text-sm text-text-secondary">Day {{ stats.simDays?.toFixed?.(0) || 0 }} · {{ stats.seasonName }} · {{ Math.round((stats.seasonProgress||0)*100) }}%</div>
    </div>

    <div class="grid grid-cols-12 gap-4">
      <!-- Status list (left) -->
      <div class="col-span-3 space-y-2">
        <div v-for="s in status" :key="s.label" class="flex items-center gap-2 text-sm">
          <span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-surface-alt border border-border text-accent text-[10px]">{{ s.icon }}</span>
          <div>
            <div class="text-text-primary">{{ s.label }}</div>
            <div class="text-xs text-text-secondary">{{ s.state }}</div>
          </div>
        </div>
      </div>

      <!-- KPI gauges (center) -->
      <div class="col-span-6 grid grid-cols-3 gap-4">
        <div v-for="k in kpis" :key="k.title" class="sci-card p-3 text-center">
          <div class="text-xs text-text-secondary mb-2">{{ k.title }}</div>
          <div class="relative mx-auto w-28 h-28 select-none">
            <div class="absolute inset-0 rounded-full" :style="{ background: `conic-gradient(var(--color-${k.accent}) ${k.angle}deg, var(--color-border) ${k.angle}deg)` }"></div>
            <div class="absolute inset-2 rounded-full bg-surface flex items-center justify-center border border-border">
              <div>
                <div class="text-2xl font-semibold">{{ k.display }}</div>
                <div class="text-xs text-text-secondary">{{ k.unit }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right-side quick facts -->
      <div class="col-span-3 space-y-3">
        <div v-for="q in quick" :key="q.label">
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="text-text-secondary">{{ q.label }}</span>
            <span class="text-text-primary font-medium">{{ q.formatted }}</span>
          </div>
          <div class="h-1.5 w-full rounded bg-border overflow-hidden">
            <div class="h-full rounded" :style="{ width: Math.round(q.pct*100) + '%', background: `var(--color-${q.color})` }"></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ stats: any; yearProgress: number; seedRate?: number; seedMax?: number }>()
const stats = props.stats || {}
const yearProgress = props.yearProgress
const seedRate = props.seedRate ?? 0
const seedMax = props.seedMax ?? 100
function fmtPct(v: number) { if (v == null) return '0%'; return `${Math.round(v*100)}%` }
const weatherState = 'Nominal'
const pollutionState = computed(() => { const p = stats.avgPollution || 0; if (p < 0.2) return 'Low'; if (p < 0.5) return 'Moderate'; return 'High' })

const status = computed(() => [
  { icon: '✔', label: 'Systems', state: 'Normal' },
  { icon: '✔', label: 'Weather', state: weatherState },
  { icon: stats.avgPollution < 0.2 ? '✔' : stats.avgPollution < 0.5 ? '•' : '!', label: 'Pollution', state: pollutionState.value },
  { icon: '✔', label: 'Hydrology', state: 'Stable' },
  { icon: '✔', label: 'Canopy', state: 'Balanced' },
])

const kpis = computed(() => {
  const items = [
    { title: 'Vitality', unit: '%', value: Math.round((stats.avgVitality||0)*100), max: 100, accent: 'accent' },
    { title: 'Pollution', unit: '%', value: Math.round((stats.avgPollution||0)*100), max: 100, accent: 'danger' },
    { title: 'Diversity', unit: 'sp', value: stats.totalSpecies||0, max: 150, accent: 'accent' },
    { title: 'Active Chunks', unit: '/', value: stats.activeChunks||0, max: stats.totalChunks||1, accent: 'accent' },
    { title: 'Year Progress', unit: '%', value: Math.round((yearProgress||0)*100), max: 100, accent: 'accent' },
    { title: 'Seeds/Day', unit: '', value: seedRate, max: seedMax, accent: 'accent' },
  ]
  return items.map(i => ({
    ...i,
    angle: Math.round(Math.max(0, Math.min(1, i.value / (i.max||1))) * 270),
    display: i.unit === '%' ? i.value : i.value
  }))
})

const quick = computed(() => [
  { label: 'Season Progress', pct: stats.seasonProgress||0, color: 'accent', formatted: fmtPct(stats.seasonProgress||0) },
  { label: 'Avg Vitality', pct: stats.avgVitality||0, color: 'accent', formatted: fmtPct(stats.avgVitality||0) },
  { label: 'Avg Pollution', pct: stats.avgPollution||0, color: 'danger', formatted: fmtPct(stats.avgPollution||0) },
  { label: 'Species', pct: Math.min(1, (stats.totalSpecies||0)/150), color: 'accent', formatted: String(stats.totalSpecies||0) },
  { label: 'Active Chunks', pct: Math.min(1, (stats.activeChunks||0)/Math.max(1, stats.totalChunks||1)), color: 'accent', formatted: `${stats.activeChunks||0}/${stats.totalChunks||0}` },
])

// Rendered via arrays above
</script>
