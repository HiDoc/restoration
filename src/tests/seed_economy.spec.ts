import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import catalogue from '@/database/catalogue.json'
import { SimulationEngine } from '@/simulation/SimulationEngine'
import { SpeciesRegistry } from '@/simulation/SpeciesRegistry'
import { useInterventionStore } from '@/stores/interventionStore'
import { plantStartingMeadow } from '@/game/startingMeadow'
import { habitatFit, rewardSpecies, STARTER_SEEDS } from '@/game/seeds'
import type { SpeciesDefinition } from '@/simulation/SpeciesRegistry'
import { stageNeed, STAGES } from '@/game/sites'
import { isRipe } from '@/game/traits'

function world() {
  const engine = new SimulationEngine({
    worldWidth: 3, worldHeight: 3, chunkSize: 32, tickRate: 10, masterSeed: 42, maxActiveChunks: 9,
    seasonLengthTicks: 90, timePerTickMinutes: 1440,
  })
  engine.activateAllChunks()
  return engine
}

const at = (x: number, y: number) => ({ chunkId: `chunk_${x}_${y}`, x: 0.5, y: 0.5 })


/** Ids of the plants in a hex with seed at least this ripe. */
function ripeIn(engine: SimulationEngine, chunkId: string, least?: number): string[] {
  const ids: string[] = []
  engine.readChunks().get(chunkId)?.species.forEach((plant: any) => { if (isRipe(plant, least)) ids.push(plant.id) })
  return ids
}
describe('seed economy', () => {
  let store: ReturnType<typeof useInterventionStore>
  let engine: SimulationEngine

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useInterventionStore()
    engine = world()
    store.initialize(engine)
  })

  it('starts with an empty pouch and fills it with the starter packet', () => {
    expect(store.seeds).toEqual({})
    store.addSeeds(STARTER_SEEDS)
    expect(store.seeds).toEqual(STARTER_SEEDS)
    expect(Object.keys(STARTER_SEEDS)).toContain(store.selectedPlantSpecies)
  })

  it('spends a seed to plant, and without one says why not', () => {
    store.addSeeds({ white_clover: 1 })
    store.selectIntervention('plant')
    const sow = () => store.executeIntervention({ ...at(1, 1), type: 'plant', data: { speciesId: 'white_clover' } })
    expect(sow()).toBe(true)
    expect(store.actionMessage).toBe('Planted White Clover.')
    expect(store.seeds).toEqual({})
    expect(store.selectedIntervention).toBeNull()
    expect(sow()).toBe(false)
    expect(store.actionMessage).toBe('You have no seeds of that species.')
  })

  it('collects a few seeds from ripe plants, which can then be sown', () => {
    plantStartingMeadow(engine)
    const collect = (x: number, y: number) => store.executeIntervention({ ...at(x, y), type: 'collect', data: { instanceIds: ripeIn(engine, `chunk_${x}_${y}`) } })
    expect(collect(1, 1)).toBe(false)
    expect(store.actionMessage).toBe('Nothing ripe to collect here yet.')

    let collected = false
    for (let day = 0; day < 360 && !collected; day += 10) {
      for (let tick = 0; tick < 10; tick++) engine.update()
      collected = [0, 1, 2].some(x => [0, 1, 2].some(y => collect(x, y)))
    }
    expect(collected).toBe(true)
    expect(store.actionMessage).toMatch(/^Collected \d .+ seed\.$/)
    const [species, count] = Object.entries(store.seeds)[0]
    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThanOrEqual(3)
    expect(store.executeIntervention({ ...at(0, 0), type: 'plant', data: { speciesId: species } })).toBe(true)
    expect(store.seeds[species] ?? 0).toBe(count - 1)
  })

  it('makes environmental interventions rest between uses, each on its own clock', () => {
    const use = (type: 'irrigate' | 'cleanse') => store.executeIntervention({ ...at(1, 1), type, data: {} })
    expect(use('irrigate')).toBe(true)
    expect(use('irrigate')).toBe(false)
    expect(store.actionMessage).toBe('Ready again in 5 days')
    expect(use('cleanse')).toBe(true)
    for (let tick = 0; tick < 5; tick++) engine.update()
    expect(use('irrigate')).toBe(true)
  })
})

describe('habitat fit', () => {
  const clover = SpeciesRegistry.getInstance().getSpecies('white_clover')!
  const hex = (biome: Partial<{ moisture: number; canopy: number; pollution: number; soil: number }>, light = 0.9) => ({
    biomeState: { moisture: (clover.moistureRange.min + clover.moistureRange.max) / 2, canopy: 0, pollution: 0, soil: 0.6, ...biome },
    climateState: { light },
  })

  it('says a plant likes a hex that meets its needs', () => {
    expect(habitatFit(clover, hex({}))).toEqual({ good: true, words: 'Likes it here.' })
  })

  it('names every need a hex falls short of', () => {
    const shaded = hex({ moisture: clover.moistureRange.min - 0.1, canopy: 1 }, clover.lightRequirement)
    expect(habitatFit(clover, shaded).words).toBe('Too dry and too shady.')
    expect(habitatFit(clover, hex({ pollution: 0.5, soil: 0.1 })).words).toBe('Polluted and poor soil.')
  })
})

describe('goal rewards', () => {
  const ground = { biomeState: { moisture: 0.25, canopy: 0, pollution: 0, soil: 0.6 }, climateState: { light: 0.9 } }
  const place = (...ids: string[]) => ({ ...ground, species: ids.map(speciesId => ({ speciesId })) })
  const plants = catalogue.plants as unknown as SpeciesDefinition[]

  it('send a plant neither on the map nor in the pouch, one that would like the ground here', () => {
    const suits = (id: string | null) => habitatFit(plants.find(plant => plant.id === id)!, ground).good
    const first = rewardSpecies([place(), place()], {})
    expect(suits(first)).toBe(true)
    // Not one already growing, nor one in the pouch.
    const next = rewardSpecies([place(first!)], {})
    expect(next).not.toBe(first)
    expect(rewardSpecies([place()], { [first!]: 3 })).not.toBe(first)
    // A plant that likes nowhere here is sent only when nothing else is missing.
    const unsuited = plants.filter(plant => !habitatFit(plant, ground).good).map(plant => plant.id)
    expect(unsuited.length).toBeGreaterThan(0)
    expect(rewardSpecies([place(...plants.map(plant => plant.id).filter(id => id !== unsuited[0]))], {})).toBe(unsuited[0])
    expect(rewardSpecies([place(...plants.map(plant => plant.id))], {})).toBeNull()
  })

  it('favour what the next stage needs: flowers for pollinators, food for birds', () => {
    const def = (id: string | null) => plants.find(plant => plant.id === id)!
    expect(def(rewardSpecies([place()], {}, 'pollinators')).pollination).toBe('insect')
    const birdPlants = new Set(catalogue.interactions.filter(link => link.species_b_type === 'bird').map(link => link.species_a_id))
    expect(birdPlants.has(rewardSpecies([place()], {}, 'birds')!)).toBe(true)
    expect(stageNeed(STAGES.findIndex(stage => stage.title === 'Pioneers'))).toBe('pollinators')
    expect(stageNeed(STAGES.length - 1)).toBeUndefined()
  })
})
