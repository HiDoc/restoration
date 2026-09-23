import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { SimulationEngine } from '@/simulation/SimulationEngine'
import type { Season } from '@/simulation/SpeciesRegistry'
import { emptyKnowledge, learn, see, type Discovery, type Knowledge } from '@/game/knowledge'
import { codexTotals, knowledgeSummary } from '@/game/codex'

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

/** What the player has witnessed, fed from the world after each displayed tick and saved with the game. */
export const useKnowledgeStore = defineStore('knowledge', () => {
  const knowledge = ref<Knowledge>(emptyKnowledge())
  // Events up to this tick are already folded in. By tick rather than index: the journal trims old events.
  const lastTick = ref(-1)

  const summary = computed(() => knowledgeSummary(knowledge.value))
  const totals = computed(() => codexTotals(knowledge.value))

  /** Folds in what the player can now see on the map and in new events; returns what is new to them. */
  function observe(engine: SimulationEngine): Discovery[] {
    const config = engine.getConfig()
    const daysPerTick = (config.timePerTickMinutes ?? 1440) / 1440
    const seasonDays = config.seasonLengthTicks ?? 90
    const seasonOf = (tick: number) => SEASONS[Math.floor((tick * daysPerTick) / seasonDays) % 4]
    const tick = engine.getCurrentTick()
    const fresh = engine.getEventJournal().getAllEvents().filter(event => event.tick > lastTick.value)
    lastTick.value = tick
    const plants = new Set<string>()
    engine.readChunks().forEach(chunk => chunk.species.forEach(plant => plants.add(plant.speciesId)))
    return [...see(knowledge.value, plants, tick), ...learn(knowledge.value, fresh, seasonOf)]
  }

  function reset() {
    knowledge.value = emptyKnowledge()
    lastTick.value = -1
  }

  const exportState = () => ({ knowledge: knowledge.value, lastTick: lastTick.value })
  function importState(state: ReturnType<typeof exportState> | undefined) {
    knowledge.value = state?.knowledge ?? emptyKnowledge()
    lastTick.value = state?.lastTick ?? -1
  }

  return { knowledge, summary, totals, observe, reset, exportState, importState }
})
