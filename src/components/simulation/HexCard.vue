<template>
  <section class="hex-card nv-panel-dark flex flex-col p-3" :aria-label="`${story.title}, hex ${coords.x}, ${coords.y}`" @keydown.esc="menu = null">
    <header class="flex items-start justify-between gap-2">
      <h3 class="font-bold leading-tight">{{ story.title }}</h3>
      <span class="flex items-center gap-2">
        <span class="nv-nums whitespace-nowrap text-sm opacity-80">({{ coords.x }}, {{ coords.y }})</span>
        <button type="button" class="hex-card-icon" aria-label="Close" title="Close" @click="$emit('close')"><LineIcon name="close" class="h-4 w-4" /></button>
      </span>
    </header>
    <p class="nv-small opacity-85">{{ story.phrase }}</p>

    <nav class="mt-2 flex gap-1" role="tablist" aria-label="What is here">
      <button v-for="t in tabs" :key="t.id" type="button" role="tab" class="hex-card-tab" :aria-selected="tab === t.id" @click="tab = t.id">
        {{ t.label }}<span v-if="t.count !== undefined" class="nv-nums ml-1 opacity-70">{{ t.count }}</span><span v-if="t.dot" class="hex-card-dot" aria-label="sampled"></span>
      </button>
    </nav>

    <div class="mt-1.5 min-h-0 flex-1 overflow-y-auto pr-0.5" role="tabpanel">
      <ul v-if="tab === 'plants'" class="grid gap-0.5 text-sm">
        <li v-if="story.plants.length === 0" class="nv-small opacity-70">Nothing grows here yet. Sow seed from your pouch, or wait for the wind.</li>
        <li v-for="plant in story.plants" :key="plant.id" class="hex-card-row">
          <span class="flex min-w-0 items-center gap-2"><img :src="nv(ACTIVITY_ICONS[plant.activity])" alt="" class="h-4 w-4 flex-shrink-0 object-contain" /><span class="truncate">{{ plant.name }}</span></span>
          <span class="nv-small flex flex-shrink-0 items-center gap-1 opacity-85">
            <span v-if="plant.limit" class="font-bold text-[#f0b48a]">{{ plant.limit }}</span><template v-else>{{ ACTIVITY_WORDS[plant.activity] }}</template>
            <span class="nv-nums">· {{ plant.count }}</span>
            <RowMenu :open="menu === plant.id" :label="plant.name" :items="plantItems(plant)" @toggle="toggle(plant.id)" @pick="pick" />
          </span>
        </li>
      </ul>

      <ul v-else-if="tab === 'animals'" class="grid gap-0.5 text-sm">
        <li v-if="story.animals.length === 0" class="nv-small opacity-70">No animals here now. Listen: some are heard before they are seen.</li>
        <li v-for="animal in story.animals" :key="animal.id" class="hex-card-row">
          <span class="flex min-w-0 items-center gap-2"><img :src="nv(animal.group === 'bird' ? 'icon-birds' : 'icon-pollinators')" alt="" class="h-4 w-4 flex-shrink-0 object-contain" /><span class="truncate first-letter:uppercase">{{ animal.name }}</span></span>
          <span class="nv-small flex flex-shrink-0 items-center gap-1 opacity-85">
            <span class="nv-nums">{{ animal.count }}</span>
            <RowMenu :open="menu === animal.id" :label="animal.name" :items="animalItems(animal)" @toggle="toggle(animal.id)" @pick="pick" />
          </span>
        </li>
      </ul>

      <div v-else class="nv-small grid gap-1">
        <template v-if="sample">
          <p class="opacity-80">Sampled on day {{ sample.day }}<template v-if="sample.changed">; <span class="font-bold text-[#f0b48a]">changed since sampling</span></template></p>
          <dl class="nv-nums grid gap-0.5">
            <div v-for="row in sample.rows" :key="row.label" class="hex-card-row">
              <dt>{{ row.label }}</dt>
              <dd>{{ row.value }}</dd>
            </div>
          </dl>
          <p>{{ sample.tray }}</p>
        </template>
        <p v-else class="opacity-70">Not sampled yet. A sample reads the soil and water, and grows a tray of the soil's seed.</p>
        <p v-if="traceText">{{ traceText }}</p>
        <p v-if="fungi.length">Fruiting bodies: {{ fungi.join(', ') }}.</p>
      </div>
    </div>

    <p v-if="fit" class="nv-small mt-2 border-t border-[#c9a227]/30 pt-2">{{ fit.species }}: <span class="font-bold">{{ fit.words }}</span></p>

    <div class="hex-card-actions mt-2 border-t border-[#c9a227]/30 pt-2" role="toolbar" aria-label="Actions in this hex">
      <button
        v-for="action in actions"
        :key="action.id"
        type="button"
        class="hex-card-action"
        :class="{ 'hex-card-action--main': action.main }"
        :title="action.hint"
        @click="$emit('act', action.id)"
      >
        <LineIcon :name="action.icon" class="h-5 w-5" />
        <span>{{ action.label }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { HexDescription, HexPlant, HexAnimal, PlantActivity } from '@/game/hexDescription'
import type { LineIconName } from './lineIcons'
import LineIcon from './LineIcon.vue'
import RowMenu, { type RowMenuItem } from './RowMenu.vue'
import { nv } from './nouveauAssets'

export type HexAction = 'plant' | 'collect' | 'cross' | 'fungi' | 'sample' | 'listen' | 'trace' | 'note'

const props = defineProps<{
  story: HexDescription
  coords: { x: number; y: number }
  /** Species with a plant here not yet tagged. */
  taggable: string[]
  /** Animals the player can follow (seen pollinators). */
  followable: string[]
  sample: { day: number; rows: Array<{ label: string; value: string }>; changed: boolean; tray: string } | null
  traceText: string
  fungi: string[]
  /** How the seed in hand would fare here, when Plant is armed. */
  fit: { species: string; words: string } | null
}>()
const emit = defineEmits<{
  close: []
  act: [action: HexAction]
  tag: [speciesId: string]
  photo: [id: string]
  follow: [id: string]
}>()

const ACTIVITY_WORDS: Record<PlantActivity, string> = { flowering: 'in flower', fruiting: 'fruiting', dormant: 'resting', growing: 'growing' }
const ACTIVITY_ICONS: Record<PlantActivity, string> = { flowering: 'icon-plants', fruiting: 'icon-diversity', dormant: 'icon-leaf', growing: 'icon-vitality' }

type Tab = 'plants' | 'animals' | 'ground'
const tab = ref<Tab>('plants')
const tabs = computed(() => [
  { id: 'plants' as const, label: 'Plants', count: props.story.plants.length },
  { id: 'animals' as const, label: 'Animals', count: props.story.animals.length },
  { id: 'ground' as const, label: 'Ground', dot: !!props.sample },
])

// One row's menu open at a time; a new hex closes it.
const menu = ref<string | null>(null)
watch(() => `${props.coords.x},${props.coords.y}`, () => { menu.value = null })
const toggle = (id: string) => { menu.value = menu.value === id ? null : id }
// A click anywhere else closes the open menu (the menu's own clicks stop propagating).
const closeMenu = () => { menu.value = null }
onMounted(() => document.addEventListener('click', closeMenu))
onBeforeUnmount(() => document.removeEventListener('click', closeMenu))
function pick(item: RowMenuItem) {
  menu.value = null
  if (item.id === 'tag') emit('tag', item.target)
  else if (item.id === 'photo') emit('photo', item.target)
  else emit('follow', item.target)
}
const plantItems = (plant: HexPlant): RowMenuItem[] => [
  ...(props.taggable.includes(plant.id) ? [{ id: 'tag' as const, target: plant.id, icon: 'tag' as const, label: 'Tag the oldest and follow it' }] : []),
  { id: 'photo', target: plant.id, icon: 'photo', label: 'Photograph' },
]
const animalItems = (animal: HexAnimal): RowMenuItem[] => [
  { id: 'photo', target: animal.id, icon: 'photo', label: 'Photograph' },
  ...(props.followable.includes(animal.id) ? [{ id: 'follow' as const, target: animal.id, icon: 'follow' as const, label: 'Follow from flower to flower' }] : []),
]

/** The actions that apply in this hex now; planting leads when a seed is in hand. */
const actions = computed(() => {
  const stages = new Set(props.story.plants.map(p => p.activity))
  const list: Array<{ id: HexAction; icon: LineIconName; label: string; hint: string; main?: boolean; when: boolean }> = [
    { id: 'plant', icon: 'plant', label: 'Plant', hint: 'Sow the seed in hand here', main: true, when: !!props.fit },
    { id: 'collect', icon: 'collect', label: 'Collect', hint: 'Take seed from ripe plants', when: stages.has('fruiting') },
    { id: 'cross', icon: 'cross', label: 'Cross', hint: 'Carry pollen between plants in flower', when: stages.has('flowering') },
    { id: 'fungi', icon: 'fungi', label: 'Fungi', hint: 'Look closely at the fruiting bodies', when: props.fungi.length > 0 },
    { id: 'sample', icon: 'sample', label: props.sample ? 'Resample' : 'Sample', hint: 'Read the soil and water; grow a tray of its seed', when: true },
    { id: 'listen', icon: 'listen', label: 'Listen', hint: 'Hear the birds and insects here and around', when: true },
    { id: 'trace', icon: 'trace', label: 'Trace', hint: 'Follow where the water runs from here', when: true },
    { id: 'note', icon: 'calendar', label: 'Note', hint: 'Note first flowers, fruit and arrivals in the calendar', when: true },
  ]
  return list.filter(action => action.when)
})
</script>

<style>
.hex-card-tab {
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
  font-size: 0.75rem;
  color: var(--nv-parchment-100);
  border: 1px solid rgba(201, 162, 39, 0.35);
}
.hex-card-tab[aria-selected='true'] {
  background: var(--nv-parchment-100);
  color: var(--nv-ink-900);
  border-color: var(--nv-brass-500);
}
.hex-card-dot {
  display: inline-block;
  width: 0.4rem;
  height: 0.4rem;
  margin-left: 0.3rem;
  border-radius: 999px;
  background: var(--nv-leaf-500);
  vertical-align: middle;
}
.hex-card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 1.6rem;
}
.hex-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 999px;
  color: var(--nv-parchment-100);
  opacity: 0.8;
}
.hex-card-icon:hover { opacity: 1; background: rgba(246, 238, 218, 0.12); }
.hex-card-actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.25rem;
}
.hex-card-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.35rem 0.1rem;
  border-radius: 0.5rem;
  font-size: 0.68rem;
  line-height: 1;
  color: var(--nv-parchment-100);
  border: 1px solid transparent;
}
.hex-card-action:hover { background: rgba(246, 238, 218, 0.1); border-color: rgba(201, 162, 39, 0.45); }
.hex-card-action--main {
  background: linear-gradient(180deg, #e9d59a 0%, #d2b060 100%);
  color: var(--nv-ink-900);
  border-color: var(--nv-brass-500);
}
.hex-card-action--main:hover { background: linear-gradient(180deg, #f1e2b3 0%, #dcbd72 100%); }
.hex-card :focus-visible { outline: 2px solid var(--nv-brass-400); outline-offset: 1px; }
/* As a sheet over the page on a phone, the card must not let the panels behind show through */
@media (max-width: 767px) {
  .hex-card { background: rgba(13, 31, 22, 0.97); backdrop-filter: blur(4px); box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.45); }
}
</style>
