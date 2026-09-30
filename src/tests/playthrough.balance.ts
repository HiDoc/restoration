import { describe, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { SimulationEngine } from '@/simulation/SimulationEngine'
import { SpeciesRegistry } from '@/simulation/SpeciesRegistry'
import { EventType } from '@/simulation/EventJournal'
import { useInterventionStore } from '@/stores/interventionStore'
import { useKnowledgeStore } from '@/stores/knowledgeStore'
import { useGoalsStore } from '@/stores/goalsStore'
import { advance, elevationOf, phOf, siteById, stageNeed, STAGES, surveySite, type SiteProgress } from '@/game/sites'
import { habitatFit, REWARD_SEEDS, rewardSpecies } from '@/game/seeds'
import { codexTotals } from '@/game/codex'
import { isRipe } from '@/game/traits'
import { fruitingBodies, listen, photograph, visibleFirsts } from '@/game/watching'
import { describeHex } from '@/game/hexDescription'
import { crossBarrier } from '@/game/hybrids'
import type { Season } from '@/simulation/SpeciesRegistry'

/**
 * A scripted player plays each site for ten years, as a patient player would: sows what the pouch holds where
 * it fits, watches (listens and photographs) every week, collects ripe seed in autumn and sows it, and makes a
 * cross each spring. It reports how the site and the Codex come along, for tuning.
 */
const YEARS = 10
const WEEK = 7
const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

function play(siteId: string) {
  setActivePinia(createPinia())
  const site = siteById(siteId)!
  const engine = new SimulationEngine({
    worldWidth: site.world.width, worldHeight: site.world.height, chunkSize: 32, tickRate: 10, masterSeed: site.world.seed,
    maxActiveChunks: site.world.width * site.world.height, seasonLengthTicks: 90, timePerTickMinutes: 1440, site: site.id,
  })
  engine.applyScenarioConditions({ biomeStates: site.conditions, elevation: elevationOf(site), ph: phOf(site), establishedSpecies: site.established, initialSpecies: site.established })
  const pouch = useInterventionStore()
  pouch.initialize(engine)
  pouch.addSeeds(site.starterSeeds)
  const knowledge = useKnowledgeStore()
  const goals = useGoalsStore()
  goals.initialize(engine, 'normal', () => knowledge.summary)

  // A small deterministic stream for the player's choices.
  let seed = 12345
  const rand = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 2 ** 32)
  const hexes = () => [...engine.readChunks().values()] as any[]
  const act = (hex: any, type: any, data: Record<string, unknown>) => pouch.executeIntervention({ chunkId: hex.id, x: 0.5, y: 0.5, type, data })

  let progress: SiteProgress = { stage: 0, heldSeasons: 0 }
  const stageDay: Record<string, number> = {}
  const rewards: string[] = []
  const deaths: Record<string, number> = {}
  const timeline: Array<Record<string, unknown>> = []
  const completed = new Set<string>()
  let lastTick = 0

  for (let day = WEEK; day <= YEARS * 360; day += WEEK) {
    engine.advance(WEEK)
    const season = SEASONS[Math.floor(day / 90) % 4]
    knowledge.observe(engine)

    // Sow: one seed of each kind in the pouch where it fits best (the emptiest fitting hex).
    for (const species of Object.keys(pouch.seeds)) {
      const def = SpeciesRegistry.getInstance().getSpecies(species)
      if (!def) continue
      const fits = hexes().filter(hex => habitatFit(def, hex).good && hex.species.size < 40)
      const target = fits.sort((a, b) => a.species.size - b.species.size)[0]
      if (target) act(target, 'plant', { speciesId: species })
    }
    // Watch: listen where most animals are, and photograph the animals of one hex.
    const lively = hexes().sort((a, b) => Object.keys(b.fauna ?? {}).length - Object.keys(a.fauna ?? {}).length)[0]
    if (lively) {
      knowledge.listenedTo(listen(hexes(), lively), engine.getCurrentTick())
      for (const [animal, count] of Object.entries((lively.fauna ?? {}) as Record<string, number>)) {
        if (count < 1) continue
        const shot = photograph(lively, animal, rand)
        knowledge.photographed({ subject: animal, ...shot, habitat: describeHex(lively).habitat, site: site.id, tick: day, when: '' }, lively.id)
      }
    }
    // Sample a hex not yet sampled, tag a plant, and note the firsts in view, each week.
    const unsampled = hexes().find(hex => !hex.sample)
    if (unsampled) act(unsampled, 'sample', {})
    const tagless = hexes().find(hex => hex.species.size > 0)
    if (tagless && Object.keys(engine.getTags()).length < 6) {
      let oldest: any
      tagless.species.forEach((plant: any) => { if (!engine.getTags()[plant.id] && (!oldest || plant.age > oldest.age)) oldest = plant })
      if (oldest) act(tagless, 'tag', { instanceId: oldest.id })
    }
    for (const hex of hexes()) {
      for (const first of visibleFirsts(hex, knowledge.knowledge)) knowledge.noted(site.id, first.species, Math.floor(day / 360), first.phase, day % 360)
    }
    // Look closely at fruiting fungi wherever they are.
    for (const hex of hexes()) {
      if (hex.fruiting?.length) knowledge.inspectedFungi(fruitingBodies(hex), season, engine.getCurrentTick(), hex.id)
    }
    // Collect fully ripe seed in autumn, a few plants at a time, of kinds the pouch is short of.
    if (season === 'autumn') {
      for (const hex of hexes()) {
        const ripe: string[] = []
        hex.species.forEach((plant: any) => { if (isRipe(plant, 0.7) && (pouch.seeds[plant.speciesId] ?? 0) < 3 && ripe.length < 2) ripe.push(plant.id) })
        if (ripe.length) act(hex, 'collect', { instanceIds: ripe })
      }
    }
    // Cross two flowering plants that can cross, once each spring.
    // One week in mid-spring, when most flowers are open.
    if (season === 'spring' && day % 90 >= 28 && day % 90 < 28 + WEEK) {
      for (const hex of hexes()) {
        const open: any[] = []
        engine.readChunksDetailed().get(hex.id)?.species.forEach((p: any) => { if (p.phenologyStage === 'flowering') open.push(p) })
        const reg = SpeciesRegistry.getInstance()
        const mother = open.find(p => !p.pollen)
        const father = mother && open.find(p => p.id !== mother.id && p.speciesId !== mother.speciesId && !crossBarrier(reg.getSpecies(mother.speciesId), reg.getSpecies(p.speciesId)))
        if (mother && father && act(hex, 'cross', { mother: mother.id, father: father.id, prediction: {} })) break
      }
    }
    // Goals and their rewards, as the game gives them.
    for (const result of goals.evaluateGoals(engine.getCurrentTick())) {
      if (!result.completed || completed.has(result.goal.id)) continue
      completed.add(result.goal.id)
      const species = rewardSpecies(engine.readChunks().values() as any, pouch.seeds, stageNeed(progress.stage))
      if (species) pouch.addSeeds({ [species]: REWARD_SEEDS })
      rewards.push(`day ${day}: ${result.goal.title} → ${species}`)
    }
    // The site's stage.
    const survey = surveySite(engine.readChunks().values())
    progress = advance(progress, survey, site.targets, day % 90 < WEEK)
    const title = STAGES[progress.stage].title
    if (!(title in stageDay)) {
      stageDay[title] = day
      // A new stage sends seed, as in the game.
      const species = day > WEEK && rewardSpecies(engine.readChunks().values() as any, pouch.seeds, stageNeed(progress.stage))
      if (species) pouch.addSeeds({ [species]: REWARD_SEEDS })
      if (species) rewards.push(`day ${day}: stage ${title} → ${species}`)
    }
    // Deaths by cause.
    for (const event of engine.getEventJournal().getAllEvents()) {
      if (event.tick <= lastTick || event.type !== EventType.SPECIES_DIE) continue
      const cause = (event.data as { cause?: string })?.cause ?? '?'
      deaths[cause] = (deaths[cause] ?? 0) + 1
    }
    lastTick = engine.getCurrentTick()
    if (Math.floor(day / 360) > Math.floor((day - WEEK) / 360)) {
      const totals = codexTotals(knowledge.knowledge)
      const fruiting = hexes().filter(hex => hex.fruiting?.length || Object.values(hex.fungi ?? {}).some((e: any) => e >= 0.3)).length
      timeline.push({
        year: Math.floor(day / 360),
        stage: title,
        ...survey,
        codex: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, `${v.known}/${v.total}`])),
        fungalHexes: fruiting,
        pouch: Object.values(pouch.seeds).reduce((a, b) => a + b, 0),
      })
    }
  }
  return { site: site.id, stageDay, timeline, rewards, deaths, goalsLeft: goals.activeGoalIds }
}

describe('ten-year playthroughs', () => {
  it.each(['meadow', 'woodland', 'wetland'])('%s', siteId => {
    const report = play(siteId)
    console.log(`PLAYTHROUGH ${JSON.stringify(report, null, 1)}`)
  }, 600_000)
})
