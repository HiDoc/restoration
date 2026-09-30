<template>
  <div v-if="show" class="sci-modal-overlay" @click.self="$emit('close')">
    <div class="sci-modal nv-ornate flex max-h-[90vh] w-full max-w-3xl flex-col" role="dialog" aria-labelledby="journal-title">
      <!-- Indented to clear the frame's corner flourish -->
      <header class="flex items-baseline justify-between gap-2 pl-5">
        <h2 id="journal-title" class="nv-heading text-2xl">Journal</h2>
        <button type="button" class="nv-link" @click="$emit('close')">Close</button>
      </header>
      <p class="nv-small nv-muted mt-1 pl-5">Plants you follow: the ones you planted, hybrids you bred, and any you tag from a hex.</p>
      <ul class="mt-3 grid min-h-0 flex-1 gap-2 overflow-y-auto pr-1">
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
import { journalEntries, type JournalEntry } from '@/game/journal'
import { speciesInfo } from '@/game/speciesInfo'
import { useInterventionStore } from '@/stores/interventionStore'

const props = defineProps<{ show: boolean; tick: number }>()
defineEmits<{ close: []; inspect: [chunkId: string] }>()

const interventions = useInterventionStore()
const version = ref(0)
// Re-read as the world moves on (tick) and after a rename (version).
const entries = computed(() => {
  void props.tick
  void version.value
  const engine = interventions.engine
  if (!props.show || !engine) return []
  return journalEntries(engine.getTags(), engine.readChunks().values(), id => speciesInfo(id).name)
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
