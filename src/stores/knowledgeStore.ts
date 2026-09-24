import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { SimulationEngine } from '@/simulation/SimulationEngine'
import type { Season } from '@/simulation/SpeciesRegistry'
import { emptyKnowledge, learn, see, type Discovery, type Knowledge } from '@/game/knowledge'
import { investigate as investigateSite, type SiteView } from '@/game/mysteries'
import { codexTotals, knowledgeSummary } from '@/game/codex'
import { SpeciesRegistry } from '@/simulation/SpeciesRegistry'

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
    applyNames()
    return [...see(knowledge.value, plants, tick), ...learn(knowledge.value, fresh, seasonOf)]
  }

  /**
   * The player's names for their hybrids replace the invented ones wherever the game names a species. Every
   * hybrid is renamed, because the registry outlives a game and would otherwise keep a previous game's names.
   */
  function applyNames() {
    const registry = SpeciesRegistry.getInstance()
    for (const species of registry.getAllSpecies()) registry.nameHybrid(species.id, knowledge.value.names[species.id])
  }

  /** Look for the current site's mysteries in what the map shows now. */
  function investigate(siteId: string, view: SiteView, tick: number): Discovery[] {
    return investigateSite(knowledge.value, siteId, view, tick)
  }

  function rename(id: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    knowledge.value.names[id] = trimmed
    applyNames()
  }

  /** Follow a different world (another site, or a loaded save) from its current day, keeping what is known. */
  function followWorld(engine: SimulationEngine) {
    lastTick.value = engine.getCurrentTick()
  }

  function reset() {
    knowledge.value = emptyKnowledge()
    applyNames()
    lastTick.value = -1
  }

  const exportState = () => ({ knowledge: knowledge.value, lastTick: lastTick.value })
  function importState(state: ReturnType<typeof exportState> | undefined) {
    knowledge.value = { ...emptyKnowledge(), ...state?.knowledge }
    applyNames()
    lastTick.value = state?.lastTick ?? -1
  }

  return { knowledge, summary, totals, observe, investigate, rename, followWorld, reset, exportState, importState }
})
