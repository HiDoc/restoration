<template>
  <Modal :show="show" title="Codex" size="xl" @close="$emit('close')">
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
        <ul v-if="active === 'mystery'" class="grid gap-2" aria-label="Mysteries">
          <li v-if="mysteries.length === 0" class="nv-small nv-muted">No mysteries yet. Some things only look odd once you have watched a while.</li>
          <li v-for="mystery in mysteries" :key="mystery.id" class="nv-panel p-3">
            <div class="flex items-baseline justify-between gap-2">
              <h3 class="font-bold">{{ mystery.question }}</h3>
              <span class="nv-small nv-muted whitespace-nowrap">{{ mystery.solved ? 'Solved' : 'Open' }}</span>
            </div>
            <p class="nv-small nv-muted">{{ mystery.site }}</p>
            <p class="nv-small mt-1">{{ mystery.solved ? mystery.explanation : `Clue: ${mystery.clue}` }}</p>
          </li>
        </ul>

        <ul v-else-if="active !== 'interaction'" class="grid gap-2 sm:grid-cols-2">
          <li v-for="entry in shown" :key="entry.id" class="nv-panel p-3">
            <template v-if="entry.known">
              <div class="flex flex-wrap items-baseline justify-between gap-x-2">
                <form v-if="renaming === entry.id" class="flex gap-1" @submit.prevent="rename(entry.id)">
                  <input v-model="newName" class="nv-btn w-36 px-1 text-left" :aria-label="`New name for ${entry.name}`" maxlength="40" />
                  <button type="submit" class="nv-link nv-small">Save</button>
                </form>
                <h3 v-else class="whitespace-nowrap font-bold">{{ entry.name }}</h3>
                <span class="nv-small nv-muted italic">{{ entry.scientificName }}</span>
              </div>
              <p v-if="entry.pedigree" class="nv-small mt-0.5">
                Bred from {{ entry.pedigree }}
                <button v-if="renaming !== entry.id" type="button" class="nv-link ml-1" @click="startRename(entry)">Rename</button>
              </p>
              <span class="nv-bar mt-1 block w-full nv-bar-leaf" :aria-label="`${Math.round(entry.progress * 100)}% known`"><span :style="{ width: `${Math.round(entry.progress * 100)}%` }"></span></span>
              <dl class="nv-small mt-2 grid gap-0.5">
                <div v-for="fact in entry.facts" :key="fact.label" class="flex justify-between gap-2">
                  <dt class="nv-muted">{{ fact.label }}</dt>
                  <dd>{{ [...fact.known, ...Array(fact.missing).fill('?')].join(', ') }}</dd>
                </div>
              </dl>
              <details v-if="adaptations[entry.id]" class="nv-small mt-2">
                <summary class="cursor-pointer">How they have changed here</summary>
                <p class="nv-muted mt-1">
                  Plants per trait value, low to high:
                  <span class="whitespace-nowrap"><svg width="10" height="10" class="inline" aria-hidden="true"><rect x="1" y="1" width="8" height="8" rx="1" :fill="NOW" /></svg> now</span>,
                  <span class="whitespace-nowrap"><svg width="10" height="10" class="inline" aria-hidden="true"><rect x="1.5" y="1.5" width="7" height="7" rx="1" fill="none" :stroke="THEN" stroke-width="1.5" /></svg> when first recorded</span>.
                </p>
                <div v-for="row in adaptations[entry.id]" :key="row.trait" class="mt-1.5">
                  <span>{{ row.name }}<template v-if="row.words">: {{ row.words }}</template></span>
                  <svg :viewBox="`0 0 ${BINS * BAR} 24`" class="h-6 w-full" preserveAspectRatio="none" role="img" :aria-label="`${row.name}: ${row.words ?? 'unchanged'}`">
                    <g v-for="(count, bin) in row.now" :key="bin">
                      <title>{{ bin * 10 }}–{{ bin * 10 + 10 }}%: {{ count }} now, {{ row.then[bin] }} then</title>
                      <rect :x="bin * BAR + 1" :y="24 - height(row.now, count)" :width="BAR - 2" :height="height(row.now, count)" rx="1" :fill="NOW" />
                      <rect :x="bin * BAR + 1.5" :y="24 - height(row.then, row.then[bin])" :width="BAR - 3" :height="height(row.then, row.then[bin])" rx="1" fill="none" :stroke="THEN" stroke-width="1.5" />
                    </g>
                  </svg>
                </div>
              </details>
              <p v-if="entry.partners.length" class="nv-small nv-muted mt-2">{{ entry.group === 'plant' ? 'Partners' : entry.group === 'fungus' ? 'Lives with' : 'Feeds on' }}</p>
              <ul class="mt-0.5 flex flex-wrap gap-1">
                <li v-for="partner in entry.partners" :key="partner.id" class="nv-chip" :title="partner.known ? `${TAKES[partner.takes]}` : 'Not yet seen'">
                  {{ partner.known ? partner.name : '?' }}
                </li>
              </ul>
            </template>
            <template v-else-if="entry.heard">
              <h3 class="font-bold opacity-70">{{ entry.name }}</h3>
              <p class="nv-small nv-muted">Heard, not yet seen. A photo would count as a sighting.</p>
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
  </Modal>
</template>

<script setup lang="ts">
import Modal from './Modal.vue'
import { computed, ref, watch } from 'vue'
import { useKnowledgeStore } from '@/stores/knowledgeStore'
import { codexEntries, TAKES_OF, type CodexEntry, type CodexTab } from '@/game/codex'
import { speciesInfo } from '@/game/speciesInfo'
import { MYSTERIES } from '@/game/mysteries'
import { siteById } from '@/game/sites'
import { adaptation, BINS, type TraitShift } from '@/game/traits'
import { useInterventionStore } from '@/stores/interventionStore'

const props = defineProps<{ show: boolean; startTab?: CodexTab }>()
defineEmits<{ close: [] }>()

const TABS: Array<{ id: CodexTab; label: string }> = [
  { id: 'plant', label: 'Plants' },
  { id: 'pollinator', label: 'Pollinators' },
  { id: 'bird', label: 'Birds' },
  { id: 'fungus', label: 'Fungi' },
  { id: 'interaction', label: 'Interactions' },
  { id: 'mystery', label: 'Mysteries' },
]
const TAKES = {
  nectar: 'takes nectar from',
  fruit: 'eats the fruit of',
  seed: 'eats the seed of',
  insects: 'hunts insects on',
  mycorrhiza: 'partners the roots of',
  parasitism: 'rots the roots of',
  decomposition: 'decays the dead wood of',
} as const
const LINK_COLOURS = { nectar: '#b08d2a', fruit: '#a8492f', seed: '#6f5e46', insects: '#4d7f3a', mycorrhiza: '#7a5a8c', parasitism: '#8c3a3a', decomposition: '#5a5a5a' } as const

const store = useKnowledgeStore()
// Mysteries the player has come across, open ones first.
const mysteries = computed(() =>
  MYSTERIES.filter(m => store.knowledge.mysteries[m.id])
    .map(m => ({ ...m, site: siteById(m.site)?.name ?? m.site, solved: store.knowledge.mysteries[m.id].solved !== undefined }))
    .sort((a, b) => Number(a.solved) - Number(b.solved))
)
const active = ref<CodexTab>('plant')
watch(() => props.show, open => { if (open) active.value = props.startTab ?? 'plant' })

// Only hybrids the player bred can be renamed.
const renaming = ref<string | null>(null)
const newName = ref('')
function startRename(entry: CodexEntry) {
  renaming.value = entry.id
  newName.value = entry.name
}
function rename(id: string) {
  store.rename(id, newName.value)
  renaming.value = null
}
const totals = computed(() => store.totals)
const entries = computed(() => codexEntries(store.knowledge))
// Seen species first, then the unknowns as `?` cards.
const shown = computed(() => entries.value.filter(e => e.group === active.value).sort((a, b) => Number(b.known) - Number(a.known) || Number(b.heard) - Number(a.heard)))

const links = computed(() =>
  Object.values(store.knowledge.interactions).map(i => ({ ...i, takes: TAKES_OF.get(`${i.animal}|${i.plant}`) ?? 'nectar' }))
)
const plantsInGraph = computed(() => [...new Set(links.value.map(l => l.plant))])
const animalsInGraph = computed(() => [...new Set(links.value.map(l => l.animal))])
const ROW = 26
const graphHeight = computed(() => Math.max(plantsInGraph.value.length, animalsInGraph.value.length) * ROW + 12)
const rowY = (ids: string[], id: string) => 18 + ids.indexOf(id) * ROW
const nameOf = (id: string) => speciesInfo(id).name

// Adaptation at the current site: each plant species' traits now against the spread first recorded here.
const NOW = '#4d7f3a'
const THEN = '#b08d2a'
const BAR = 12
const interventions = useInterventionStore()
const adaptations = computed(() => {
  const engine = interventions.engine
  if (!props.show || !engine) return {}
  const living = new Map<string, Array<Record<string, number>>>()
  for (const hex of engine.readChunksDetailed().values()) {
    hex.species.forEach((plant: { speciesId: string; genetics?: { traits?: Record<string, number> } }) => {
      if (!living.has(plant.speciesId)) living.set(plant.speciesId, [])
      living.get(plant.speciesId)!.push(plant.genetics?.traits ?? {})
    })
  }
  const rows: Record<string, TraitShift[]> = {}
  for (const [id, baseline] of Object.entries(engine.getBaselines())) {
    if (living.has(id)) rows[id] = adaptation(baseline, living.get(id)!)
  }
  return rows
})
/** Bar height in a 24-unit row, each spread scaled to its own tallest bin so shape, not count, compares. */
function height(counts: number[], count: number) {
  return (count / Math.max(1, ...counts)) * 22
}
</script>

<style scoped>
.codex-node {
  font: 13px Georgia, serif;
  fill: #2b2118;
}
</style>
