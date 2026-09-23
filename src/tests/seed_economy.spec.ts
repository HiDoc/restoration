import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import catalogue from '@/database/catalogue.json'
import { SimulationEngine } from '@/simulation/SimulationEngine'
import { SpeciesRegistry } from '@/simulation/SpeciesRegistry'
import { useInterventionStore } from '@/stores/interventionStore'
import { plantStartingMeadow } from '@/game/startingMeadow'
import { habitatFit, rewardSpecies, STARTER_SEEDS } from '@/game/seeds'

function world() {
  const engine = new SimulationEngine({
    worldWidth: 3, worldHeight: 3, chunkSize: 32, tickRate: 10, masterSeed: 42, maxActiveChunks: 9,
    seasonLengthTicks: 90, timePerTickMinutes: 1440,
  })
  engine.activateAllChunks()
  return engine
}

const at = (x: number, y: number) => ({ chunkId: `chunk_${x}_${y}`, x: 0.5, y: 0.5 })

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
    const collect = (x: number, y: number) => store.executeIntervention({ ...at(x, y), type: 'collect', data: {} })
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
  const place = (...ids: string[]) => ({ species: ids.map(speciesId => ({ speciesId })) })

  it('send the first catalogue plant neither on the map nor in the pouch', () => {
    const [first, second, third] = catalogue.plants.map(plant => plant.id)
    expect(rewardSpecies([place(first), place()], {})).toBe(second)
    expect(rewardSpecies([place(first)], { [second]: 3 })).toBe(third)
    expect(rewardSpecies([place(...catalogue.plants.map(plant => plant.id))], {})).toBeNull()
  })
})
