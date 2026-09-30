<template>
  <div v-if="show" class="sci-modal-overlay" @click.self="$emit('close')">
    <div class="sci-modal nv-ornate flex max-h-[90vh] w-full max-w-3xl flex-col" role="dialog" aria-labelledby="journal-title">
      <!-- Indented to clear the frame's corner flourish -->
      <header class="flex items-baseline justify-between gap-2 pl-5">
        <h2 id="journal-title" class="nv-heading text-2xl">Journal</h2>
        <button type="button" class="nv-link" @click="$emit('close')">Close</button>
      </header>
      <nav class="mt-2 flex gap-1.5" role="tablist" aria-label="Journal sections">
        <button v-for="tab in TABS" :key="tab.id" type="button" role="tab" class="nv-btn" :aria-pressed="active === tab.id" :aria-selected="active === tab.id" @click="active = tab.id">
          {{ tab.label }}
        </button>
      </nav>
      <ul v-if="active === 'notebook'" class="mt-3 grid min-h-0 flex-1 gap-2 overflow-y-auto pr-1" aria-label="Hybrid notebook">
        <li v-if="notebook.length === 0" class="nv-small nv-muted">No crosses yet. Open a hex with plants in flower and cross-pollinate two of them.</li>
        <li v-for="entry in notebook" :key="entry.key" class="nv-panel p-3">
          <h3 class="font-bold">{{ entry.title }}</h3>
          <p class="nv-small nv-muted">{{ entry.status }}</p>
          <table class="nv-small mt-1 w-full">
            <thead class="nv-muted text-left">
              <tr><th class="font-normal">Trait</th><th class="font-normal">You predicted</th><th class="font-normal">Seedlings</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in entry.rows" :key="row.name">
                <td>{{ row.name }}</td>
                <td>{{ row.predicted ?? '–' }}</td>
                <td>
                  {{ row.outcome || '–' }}
                  <span v-if="row.right !== undefined" class="font-bold">{{ row.right ? '✓ as you predicted' : '✗ not as you predicted' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </li>
      </ul>
      <div v-if="active === 'garden'" class="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        <p v-if="gardens.length === 0" class="nv-small nv-muted">
          No common garden yet. Carry seed of one species from two sites (or packet seed and seed you collected), choose each in your pouch, and sow them in the same hex.
        </p>
        <section v-for="garden in gardens" :key="garden.key" class="nv-panel mb-2 p-3">
          <h3 class="font-bold">{{ garden.species }} in {{ garden.hex }}</h3>
          <table class="nv-small mt-1 w-full text-left">
            <thead class="nv-muted">
              <tr><th class="font-normal">Seed from</th><th class="font-normal">Alive</th><th class="font-normal">Health</th><th class="font-normal">Size</th><th class="font-normal">In flower</th><th class="font-normal">Seeds set</th><th class="font-normal">Died</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in garden.rows" :key="row.provenance">
                <td>{{ row.provenance }}</td>
                <td class="nv-nums">{{ row.alive }} / {{ row.planted }}</td>
                <td>{{ row.health }}</td>
                <td class="nv-nums">{{ row.size }}</td>
                <td class="nv-nums">{{ row.flowering }}</td>
                <td class="nv-nums">{{ row.seedsSet }}</td>
                <td>{{ row.deaths }}</td>
              </tr>
            </tbody>
          </table>
          <p class="nv-small nv-muted mt-1">{{ garden.note }}</p>
        </section>
      </div>
      <div v-if="active === 'photos'" class="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        <p v-if="photos.length === 0" class="nv-small nv-muted">No photos yet. Open a hex and photograph a plant or an animal there.</p>
        <div class="grid gap-2 sm:grid-cols-3">
          <PhotoCard v-for="photo in photos" :key="`${photo.tick}-${photo.subject}`" :photo="photo" />
        </div>
      </div>
      <div v-if="active === 'calendar'" class="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        <p class="nv-small nv-muted">The firsts you noted at {{ profile.site.name }}, year by year. Open a hex and choose "Note in calendar" when something flowers, fruits or arrives.</p>
        <dl class="nv-small mt-2 grid gap-1.5">
          <div v-for="row in calendarRows" :key="row.species" class="nv-panel p-2">
            <dt class="font-bold">{{ row.name }}</dt>
            <dd v-for="year in row.years" :key="year">{{ year }}</dd>
          </div>
        </dl>
      </div>
      <p v-if="active === 'plants'" class="nv-small nv-muted mt-2">Plants you follow: the ones you planted, seedlings of your crosses, and any you tag from a hex.</p>
      <ul v-if="active === 'plants'" class="mt-2 grid min-h-0 flex-1 gap-2 overflow-y-auto pr-1">
        <li v-if="entries.length === 0" class="nv-small nv-muted">Nothing tagged yet. Plant a seed, or open a hex and tag a plant.</li>
        <li v-for="entry in entries" :key="entry.instanceId" class="nv-panel p-3" :class="entry.alive ? '' : 'opacity-70'">
          <div class="flex flex-wrap items-baseline justify-between gap-x-2">
            <form v-if="renaming === entry.instanceId" class="flex gap-1" @submit.prevent="rename(entry.instanceId)">
              <input v-model="newName" class="nv-btn w-40 px-1 text-left" :aria-label="`Name for ${entry.label}`" maxlength="40" />
              <button type="submit" class="nv-link nv-small">Save</button>
            </form>
            <h3 v-else class="font-bold"><span class="nv-nums">{{ entry.label }}</span> {{ entry.title }}</h3>
            <span class="nv-small nv-muted">{{ entry.origin }}</span>
          </div>
          <p class="nv-small mt-0.5">{{ entry.status }}</p>
          <p class="nv-small nv-muted">
            {{ entry.offspring }}<template v-if="entry.parents"> · from {{ entry.parents }}</template>
          </p>
          <div class="mt-1 flex gap-3">
            <button v-if="entry.alive && renaming !== entry.instanceId" type="button" class="nv-link nv-small" @click="startRename(entry)">Name</button>
            <button v-if="entry.chunkId" type="button" class="nv-link nv-small" @click="$emit('inspect', entry.chunkId)">Inspect</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { commonGardens, journalEntries, type JournalEntry } from '@/game/journal'
import { siteById } from '@/game/sites'
import { notebookEntries } from '@/game/notebook'
import { calendar } from '@/game/watching'
import { useKnowledgeStore } from '@/stores/knowledgeStore'
import { useProfileStore } from '@/stores/profileStore'
import PhotoCard from './PhotoCard.vue'
import { speciesInfo } from '@/game/speciesInfo'
import { useInterventionStore } from '@/stores/interventionStore'

const props = defineProps<{ show: boolean; tick: number }>()
defineEmits<{ close: []; inspect: [chunkId: string] }>()

const TABS = [
  { id: 'plants', label: 'Plants' },
  { id: 'notebook', label: 'Hybrid notebook' },
  { id: 'garden', label: 'Common garden' },
  { id: 'photos', label: 'Photos' },
  { id: 'calendar', label: 'Calendar' },
] as const
const active = ref<(typeof TABS)[number]['id']>('plants')

const interventions = useInterventionStore()
const version = ref(0)
// Re-read as the world moves on (tick) and after a rename (version).
const entries = computed(() => {
  void props.tick
  void version.value
  const engine = interventions.engine
  if (!props.show || !engine) return []
  return journalEntries(engine.getTags(), engine.readChunksDetailed().values(), id => speciesInfo(id).name, siteName)
})

const knowledge = useKnowledgeStore()
const profile = useProfileStore()
const photos = computed(() => [...knowledge.knowledge.photos].reverse())
const calendarRows = computed(() => calendar(knowledge.knowledge.phenology[profile.currentSite], id => speciesInfo(id).name))

const siteName = (id: string) => siteById(id)?.name ?? id
const gardens = computed(() => {
  void props.tick
  const engine = interventions.engine
  if (!props.show || !engine) return []
  return commonGardens(engine.getTags(), engine.readChunks().values(), id => speciesInfo(id).name, siteName)
})

const notebook = computed(() => {
  void props.tick
  const engine = interventions.engine
  if (!props.show || !engine) return []
  return notebookEntries([...engine.getCrosses()], engine.getTags(), id => speciesInfo(id).name)
})

const renaming = ref<string | null>(null)
const newName = ref('')
function startRename(entry: JournalEntry) {
  renaming.value = entry.instanceId
  newName.value = ''
}
function rename(instanceId: string) {
  const chunkId = entries.value.find(e => e.instanceId === instanceId)?.chunkId
  if (chunkId) interventions.executeIntervention({ chunkId, x: 0.5, y: 0.5, type: 'tag', data: { instanceId, name: newName.value } })
  renaming.value = null
  version.value++
}
</script>
