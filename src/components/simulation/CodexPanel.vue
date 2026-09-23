<template>
  <div v-if="show" class="sci-modal-overlay" @click.self="$emit('close')">
    <div class="sci-modal nv-ornate flex max-h-[90vh] w-full max-w-4xl flex-col" role="dialog" aria-labelledby="codex-title">
      <!-- Indented to clear the frame's corner flourish -->
      <header class="flex flex-wrap items-baseline justify-between gap-2 pl-5">
        <h2 id="codex-title" class="nv-heading text-2xl">Codex</h2>
        <button type="button" class="nv-link" @click="$emit('close')">Close</button>
      </header>
      <nav class="mt-2 flex flex-wrap gap-1.5" role="tablist" aria-label="Codex sections">
        <button
          v-for="tab in TABS"
          :key="tab.id"
          type="button"
          role="tab"
          class="nv-btn"
          :aria-pressed="active === tab.id"
          :aria-selected="active === tab.id"
          @click="active = tab.id"
        >
          {{ tab.label }} <span class="nv-nums opacity-70">{{ totals[tab.id].known }} / {{ totals[tab.id].total }}</span>
        </button>
      </nav>

      <div class="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        <ul v-if="active !== 'interaction'" class="grid gap-2 sm:grid-cols-2">
          <li v-for="entry in shown" :key="entry.id" class="nv-panel p-3">
            <template v-if="entry.known">
              <div class="flex items-baseline justify-between gap-2">
                <h3 class="font-bold">{{ entry.name }}</h3>
                <span class="nv-small nv-muted italic">{{ entry.scientificName }}</span>
              </div>
              <span class="nv-bar mt-1 block w-full nv-bar-leaf" :aria-label="`${Math.round(entry.progress * 100)}% known`"><span :style="{ width: `${Math.round(entry.progress * 100)}%` }"></span></span>
              <dl class="nv-small mt-2 grid gap-0.5">
                <div v-for="fact in entry.facts" :key="fact.label" class="flex justify-between gap-2">
                  <dt class="nv-muted">{{ fact.label }}</dt>
                  <dd>{{ [...fact.known, ...Array(fact.missing).fill('?')].join(', ') }}</dd>
                </div>
              </dl>
              <p v-if="entry.partners.length" class="nv-small nv-muted mt-2">{{ entry.group === 'plant' ? 'Visited by' : 'Feeds on' }}</p>
              <ul class="mt-0.5 flex flex-wrap gap-1">
                <li v-for="partner in entry.partners" :key="partner.id" class="nv-chip" :title="partner.known ? `${TAKES[partner.takes]}` : 'Not yet seen'">
                  {{ partner.known ? partner.name : '?' }}
                </li>
              </ul>
            </template>
            <template v-else>
              <h3 class="font-bold opacity-50">?</h3>
              <p class="nv-small nv-muted">Not yet seen.</p>
            </template>
          </li>
        </ul>

        <section v-else aria-label="Known interactions">
          <p v-if="links.length === 0" class="nv-small nv-muted">No interactions witnessed yet. Watch flowers and fruit as the seasons turn.</p>
          <svg v-else :viewBox="`0 0 600 ${graphHeight}`" class="w-full" role="img" aria-label="Plants linked to the animals seen feeding on them">
            <line
              v-for="link in links"
              :key="`${link.animal}|${link.plant}`"
              :x1="170" :y1="rowY(plantsInGraph, link.plant)" :x2="430" :y2="rowY(animalsInGraph, link.animal)"
              :stroke="LINK_COLOURS[link.takes]" stroke-width="2" stroke-opacity="0.75"
            />
            <text v-for="id in plantsInGraph" :key="id" x="160" :y="rowY(plantsInGraph, id) + 4" text-anchor="end" class="codex-node">{{ nameOf(id) }}</text>
            <text v-for="id in animalsInGraph" :key="id" x="440" :y="rowY(animalsInGraph, id) + 4" class="codex-node">{{ nameOf(id) }}</text>
          </svg>
          <ul class="nv-small mt-2 grid gap-0.5">
            <li v-for="link in links" :key="`${link.animal}|${link.plant}`">
              <span :style="{ color: LINK_COLOURS[link.takes] }">●</span> {{ nameOf(link.animal) }} — {{ TAKES[link.takes] }} — {{ nameOf(link.plant) }}
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useKnowledgeStore } from '@/stores/knowledgeStore'
import { codexEntries, type CodexGroup } from '@/game/codex'
import { speciesInfo } from '@/game/speciesInfo'
import { buildFaunaDefinitions } from '@/simulation/faunaDefinitions'
import catalogue from '@/database/catalogue.json'

defineProps<{ show: boolean }>()
defineEmits<{ close: [] }>()

type Tab = CodexGroup | 'interaction'
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'plant', label: 'Plants' },
  { id: 'pollinator', label: 'Pollinators' },
  { id: 'bird', label: 'Birds' },
  { id: 'interaction', label: 'Interactions' },
]
const TAKES = { nectar: 'takes nectar from', fruit: 'eats the fruit of', seed: 'eats the seed of', insects: 'hunts insects on' } as const
const LINK_COLOURS = { nectar: '#b08d2a', fruit: '#a8492f', seed: '#6f5e46', insects: '#4d7f3a' } as const
// What each known pair consists of, from the same links the engine's animals feed by.
const TAKES_OF = new Map(buildFaunaDefinitions(catalogue).flatMap(def => def.forage.map(link => [`${def.id}|${link.plant}`, link.takes] as const)))

const store = useKnowledgeStore()
const active = ref<Tab>('plant')
const totals = computed(() => store.totals)
const entries = computed(() => codexEntries(store.knowledge))
// Seen species first, then the unknowns as `?` cards.
const shown = computed(() => entries.value.filter(e => e.group === active.value).sort((a, b) => Number(b.known) - Number(a.known)))

const links = computed(() =>
  Object.values(store.knowledge.interactions).map(i => ({ ...i, takes: TAKES_OF.get(`${i.animal}|${i.plant}`) ?? 'nectar' }))
)
const plantsInGraph = computed(() => [...new Set(links.value.map(l => l.plant))])
const animalsInGraph = computed(() => [...new Set(links.value.map(l => l.animal))])
const ROW = 26
const graphHeight = computed(() => Math.max(plantsInGraph.value.length, animalsInGraph.value.length) * ROW + 12)
const rowY = (ids: string[], id: string) => 18 + ids.indexOf(id) * ROW
const nameOf = (id: string) => speciesInfo(id).name
</script>

<style scoped>
.codex-node {
  font: 13px Georgia, serif;
  fill: #2b2118;
}
</style>
