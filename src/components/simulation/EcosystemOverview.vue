<template>
  <section class="sci-panel space-y-4 border border-emerald-400/20 bg-gradient-to-br from-emerald-950/80 via-slate-950/70 to-slate-950/75 p-5 text-slate-100 shadow-xl">
    <div class="flex items-center justify-between border-b border-emerald-400/15 pb-3">
      <h2 class="text-xl font-semibold tracking-wide text-emerald-200">Ecosystem Overview</h2>
      <div class="text-sm text-slate-300/80">Day {{ stats.simDays?.toFixed?.(0) || 0 }} · {{ stats.seasonName }} · {{ Math.round((stats.seasonProgress||0)*100) }}%</div>
    </div>

    <div class="grid grid-cols-12 gap-4">
      <!-- Status list (left) -->
      <div class="col-span-3 space-y-2">
        <div v-for="s in status" :key="s.label" class="flex items-center gap-2 text-sm text-slate-200/90">
          <span class="inline-flex h-5 w-5 items-center justify-center rounded-full border border-emerald-400/40 bg-slate-900/70 text-[11px] text-emerald-200">{{ s.icon }}</span>
          <div>
            <div class="font-semibold text-slate-100">{{ s.label }}</div>
            <div class="text-xs text-slate-300/70">{{ s.state }}</div>
          </div>
        </div>
      </div>

      <!-- KPI gauges (center) -->
      <div class="col-span-6 grid grid-cols-3 gap-4">
        <div v-for="k in kpis" :key="k.title" class="rounded-xl border border-emerald-400/25 bg-slate-950/70 p-3 text-center text-slate-100 shadow-inner">
          <div class="mb-2 text-xs uppercase tracking-[0.18em] text-slate-300/70">{{ k.title }}</div>
          <div class="relative mx-auto w-28 h-28 select-none">
            <div class="absolute inset-0 rounded-full transition-[background] duration-500" :style="{ background: `conic-gradient(var(--color-${k.accent}) ${k.angle}deg, rgba(15,23,42,0.4) ${k.angle}deg)` }"></div>
            <div class="absolute inset-2 flex items-center justify-center rounded-full border border-emerald-400/20 bg-slate-950/80">
              <div class="leading-tight">
                <div class="text-2xl font-semibold">{{ k.display }}</div>
                <div class="text-[11px] text-slate-300/70">{{ k.unit }}</div>
                <div v-if="k.delta != null" class="mt-0.5 text-[11px]" :class="k.deltaClass">
                  {{ k.delta > 0 ? '↗ +' : k.delta < 0 ? '↘ ' : '→ ' }}{{ formatDelta(k) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right-side quick facts -->
      <div class="col-span-3 space-y-3">
        <div v-for="q in quick" :key="q.label">
          <div class="mb-1 flex items-center justify-between text-xs text-slate-300/70">
            <span>{{ q.label }}</span>
            <span class="font-medium text-slate-100">{{ q.formatted }}</span>
          </div>
          <div class="h-1.5 w-full overflow-hidden rounded bg-slate-800/60">
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

// Simple in-component trend memory
const last: Record<string, number> = {}
function pickDeltaClass(title: string, delta: number): string {
  // For Pollution, up is bad; for others, up is good
  const goodUp = title !== 'Pollution'
  const positive = delta > 0
  const good = (goodUp && positive) || (!goodUp && !positive && delta !== 0)
  return good ? 'text-emerald-300' : (delta === 0 ? 'text-slate-400' : 'text-rose-300')
}
function formatDelta(k: any): string {
  if (k.unit === '%') return `${Math.abs(k.delta)}%`
  return String(Math.abs(k.delta))
}

const kpis = computed(() => {
  const items = [
    { title: 'Vitality', unit: '%', value: Math.round((stats.avgVitality||0)*100), max: 100, accent: 'accent' },
    { title: 'Pollution', unit: '%', value: Math.round((stats.avgPollution||0)*100), max: 100, accent: 'danger' },
    { title: 'Diversity', unit: 'sp', value: stats.totalSpecies||0, max: 150, accent: 'accent' },
    { title: 'Active Chunks', unit: '/', value: stats.activeChunks||0, max: stats.totalChunks||1, accent: 'accent' },
    { title: 'Year Progress', unit: '%', value: Math.round((yearProgress||0)*100), max: 100, accent: 'accent' },
    { title: 'Seeds/Day', unit: '', value: seedRate, max: seedMax, accent: 'accent' },
  ]
  return items.map(i => {
    const angle = Math.round(Math.max(0, Math.min(1, i.value / (i.max||1))) * 270)
    const prev = last[i.title]
    const rawDelta = prev == null ? 0 : i.value - prev
    last[i.title] = i.value
    const delta = i.unit === '%' ? Math.round(rawDelta) : rawDelta
    return {
      ...i,
      angle,
      display: i.value,
      delta,
      deltaClass: pickDeltaClass(i.title, delta)
    }
  })
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
