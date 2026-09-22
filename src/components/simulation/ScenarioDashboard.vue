<template>
  <section
    class="sci-panel flex flex-col gap-4 border border-emerald-400/25 bg-gradient-to-br from-emerald-950/80 via-slate-950/70 to-slate-950/80 p-4 shadow-xl"
    aria-labelledby="scenario-dashboard-heading"
  >
    <header class="flex flex-wrap items-center justify-between gap-2 text-emerald-100">
      <h2 id="scenario-dashboard-heading" class="text-sm font-semibold tracking-wide uppercase">Scenario Dashboard</h2>
      <div class="flex items-center gap-2 text-xs text-primary-300">
        <span>Tick {{ stats.currentTick }}</span>
        <span aria-hidden="true">•</span>
        <span>Year {{ currentYear }}</span>
      </div>
    </header>

    <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" role="list">
      <div
        v-for="metric in headlineMetrics"
        :key="metric.id"
        role="listitem"
        class="rounded border border-emerald-400/30 bg-gradient-to-br from-emerald-900/40 via-slate-900/50 to-slate-950/60 px-3 py-2 text-slate-100"
      >
        <div class="flex items-center justify-between text-xs uppercase tracking-wide text-primary-200/80">
          <span>{{ metric.label }}</span>
          <span>{{ metric.icon }}</span>
        </div>
        <div class="mt-1 text-lg font-semibold">{{ metric.value }}</div>
        <div v-if="metric.detail" class="text-[11px] text-primary-100/70">{{ metric.detail }}</div>
      </div>
    </div>

    <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <article class="rounded border border-emerald-400/30 bg-gradient-to-br from-emerald-900/40 via-slate-900/50 to-slate-950/60 px-3 py-3 text-slate-100">
        <header class="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
          <span>Season Progress</span>
          <span>{{ Math.round(yearProgress * 100) }}%</span>
        </header>
        <div class="mt-2 h-2 w-full overflow-hidden rounded bg-primary-800/60">
          <div
            class="h-full bg-gradient-to-r from-emerald-400 via-lime-400 to-amber-300 transition-all duration-300"
            :style="{ width: `${Math.max(4, yearProgress * 100)}%` }"
            role="presentation"
          />
        </div>
        <p class="mt-2 text-[11px] text-emerald-100/80">{{ seasonLabel }}</p>
      </article>

      <article class="rounded border border-emerald-400/30 bg-gradient-to-br from-emerald-900/40 via-slate-900/50 to-slate-950/60 px-3 py-3 text-slate-100" aria-live="polite">
        <header class="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
          <span>Rule Alerts</span>
          <span v-if="!alerts.length" class="text-primary-200/70">Clear</span>
        </header>
        <ul v-if="alerts.length" class="mt-2 grid gap-1.5 text-xs">
          <li
            v-for="alert in alerts"
            :key="alert.id"
            class="flex items-start gap-2 rounded bg-slate-900/70 px-2 py-1.5 text-slate-100"
            :class="severityClass(alert.severity)"
          >
            <span aria-hidden="true">{{ severityIcon(alert.severity) }}</span>
            <span>{{ alert.message }}</span>
          </li>
        </ul>
        <p v-else class="mt-2 text-[11px] text-emerald-100/70">All monitored goals are within healthy ranges.</p>
      </article>
    </div>

    <article class="rounded border border-emerald-400/30 bg-gradient-to-br from-emerald-900/40 via-slate-900/50 to-slate-950/60 px-3 py-3 text-slate-100">
      <header class="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
        <span>Event Timeline</span>
        <span v-if="recentEvents.length" class="text-primary-200/70">Recent</span>
      </header>
      <ol class="mt-2 grid gap-1.5 text-xs text-slate-100">
        <li v-for="event in recentEvents" :key="event.id" class="flex items-center gap-2">
          <span class="inline-flex min-w-[4.5rem] justify-end text-[11px] text-primary-200/70">{{ event.timeLabel }}</span>
          <span aria-hidden="true" class="text-primary-400">▸</span>
          <span class="flex-1 text-primary-50/90">{{ event.message }}</span>
        </li>
        <li v-if="!recentEvents.length" class="text-[11px] text-primary-100/70">Interact with the ecosystem to populate the timeline.</li>
      </ol>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type DashboardStats = {
  currentTick: number;
  totalSpecies: number;
  avgVitality: number;
  avgPollution: number;
  activeChunks: number;
};

type GoalViewModel = {
  id: string;
  title: string;
  progress: number;
  formatted: string;
  completed: boolean;
};

type DashboardAlert = {
  id: string;
  message: string;
  severity: 'info' | 'warn' | 'critical';
};

type DashboardEvent = {
  id: number;
  message: string;
  timeLabel: string;
  tick: number;
};

const props = defineProps<{
  stats: DashboardStats;
  yearProgress: number;
  currentYear: number;
  goals: GoalViewModel[];
  alerts: DashboardAlert[];
  events: DashboardEvent[];
}>();

const headlineMetrics = computed(() => {
  return [
    {
      id: 'vitality',
      label: 'Avg Vitality',
      value: `${Math.round(props.stats.avgVitality * 100)}%`,
      detail: goalDetail('vitality'),
      icon: '🌿',
    },
    {
      id: 'pollution',
      label: 'Avg Cleanliness',
      value: `${Math.round((1 - props.stats.avgPollution) * 100)}%`,
      detail: goalDetail('pollution'),
      icon: '🛡️',
    },
    {
      id: 'species',
      label: 'Species Observed',
      value: props.stats.totalSpecies.toString(),
      detail: goalDetail('species'),
      icon: '📚',
    },
    {
      id: 'chunks',
      label: 'Active Chunks',
      value: props.stats.activeChunks.toString(),
      detail: 'Managed focus area',
      icon: '🗺️',
    },
  ];
});

const recentEvents = computed(() => props.events.slice(-6).reverse());

const seasonLabel = computed(() => {
  const name = (props.stats as any).seasonName || 'Unknown season';
  const progress = Math.round(((props.stats as any).seasonProgress || 0) * 100);
  return `${name} • ${progress}% complete`;
});

function goalDetail(goalId: string): string | null {
  const match = props.goals.find((g) => g.id === goalId);
  if (!match) return null;
  return match.completed ? 'Goal complete' : `${match.formatted} of target`;
}

function severityIcon(level: DashboardAlert['severity']): string {
  switch (level) {
    case 'critical':
      return '⚠️';
    case 'warn':
      return '🔎';
    default:
      return 'ℹ️';
  }
}

function severityClass(level: DashboardAlert['severity']): string {
  switch (level) {
    case 'critical':
      return 'outline outline-1 outline-red-400/60 bg-red-500/10';
    case 'warn':
      return 'outline outline-1 outline-amber-400/50 bg-amber-400/10';
    default:
      return 'outline outline-1 outline-sky-400/40 bg-sky-400/5';
  }
}
</script>
