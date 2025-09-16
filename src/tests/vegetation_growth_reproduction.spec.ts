import { describe, it, expect, beforeEach } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { VegetationSystem } from '@/simulation/VegetationSystem'
import { WorldChunk, PhenologyStage, SpeciesInstance } from '@/simulation/WorldChunk'
import { SpeciesRegistry } from '@/simulation/SpeciesRegistry'

describe('VegetationSystem growth and reproduction with genetics', () => {
  beforeEach(() => RNGManager.initialize(1001))

  function makeFavorableChunk(): WorldChunk {
    const c = new WorldChunk(0, 0, 999)
    c.biomeState.vitality = 0.8
    c.biomeState.soil = 0.8
    c.biomeState.moisture = 0.6
    c.climateState.temperature = 20
    c.climateState.light = 0.8
    c.climateState.wind = 0.2
    return c
  }

  it('applies genetic growth_efficiency to increase growth rate', () => {
    const reg = SpeciesRegistry.getInstance()
    const def = reg.getSpecies('common_grass')!
    const veg = new VegetationSystem()
    const chunk = makeFavorableChunk()

    const base: Omit<SpeciesInstance, 'genetics'> = {
      id: 's', speciesId: 'common_grass', x: 0.5, y: 0.5,
      biomass: 0.05, age: 100, phenologyStage: PhenologyStage.VEGETATIVE,
      health: 0.9, reproductiveOutput: 0, reproductiveUrge: 0, lastReproductionAttempt: 0
    }

    const hi: SpeciesInstance = { ...base, id: 'hi', genetics: { traits: new Map([['growth_efficiency', {
      id: 'growth_efficiency', name: 'Growth', value: 0.9, baseValue: 0.9, mutationRate: 0, variance: 0, dominance: 1, beneficial: true
    }]]), generation: 0, mutations: [], adaptationScore: 0.5 } as any }
    const lo: SpeciesInstance = { ...base, id: 'lo', genetics: { traits: new Map([['growth_efficiency', {
      id: 'growth_efficiency', name: 'Growth', value: 0.1, baseValue: 0.1, mutationRate: 0, variance: 0, dominance: 1, beneficial: true
    }]]), generation: 0, mutations: [], adaptationScore: 0.5 } as any }

    chunk.addSpecies(hi)
    chunk.addSpecies(lo)

    // Single update tick
    veg.update(chunk, 1)

    const hiAfter = chunk.species.get('hi')!
    const loAfter = chunk.species.get('lo')!
    expect(hiAfter.biomass).toBeGreaterThan(loAfter.biomass)
  })

  it('reproduction_vigor increases reproductive output (self-pollinated common_grass)', () => {
    const veg = new VegetationSystem()
    const chunk = makeFavorableChunk()

    const base: Omit<SpeciesInstance, 'genetics'> = {
      id: 'p', speciesId: 'common_grass', x: 0.5, y: 0.5,
      biomass: 0.2, age: 900, phenologyStage: PhenologyStage.FRUITING,
      health: 0.9, reproductiveOutput: 0, reproductiveUrge: 0, lastReproductionAttempt: 0
    }

    const hi: SpeciesInstance = { ...base, id: 'hi', genetics: { traits: new Map([['reproduction_vigor', {
      id: 'reproduction_vigor', name: 'Repro', value: 0.9, baseValue: 0.9, mutationRate: 0, variance: 0, dominance: 1, beneficial: true
    }]]), generation: 0, mutations: [], adaptationScore: 0.5 } as any }
    const lo: SpeciesInstance = { ...base, id: 'lo', genetics: { traits: new Map([['reproduction_vigor', {
      id: 'reproduction_vigor', name: 'Repro', value: 0.1, baseValue: 0.1, mutationRate: 0, variance: 0, dominance: 1, beneficial: true
    }]]), generation: 0, mutations: [], adaptationScore: 0.5 } as any }

    chunk.addSpecies(hi)
    chunk.addSpecies(lo)

    veg.update(chunk, 1)

    const hiAfter = chunk.species.get('hi')!
    const loAfter = chunk.species.get('lo')!
    expect(hiAfter.reproductiveOutput).toBeGreaterThan(loAfter.reproductiveOutput)
  })

  it('wind increases reproduction for wind-pollinated species', () => {
    const reg = SpeciesRegistry.getInstance()
    const def = reg.getSpecies('silver_birch')!
    const veg = new VegetationSystem()
    const windy = makeFavorableChunk()
    const calm = makeFavorableChunk()
    windy.climateState.wind = 0.9
    calm.climateState.wind = 0.0

    const mk = (id: string): SpeciesInstance => ({
      id,
      speciesId: 'silver_birch',
      x: 0.5,
      y: 0.5,
      biomass: def.reproductionThreshold + 0.1,
      age: 10000,
      phenologyStage: PhenologyStage.FRUITING,
      health: 0.9,
      reproductiveOutput: 0,
      reproductiveUrge: 0,
      lastReproductionAttempt: 0,
    })

    const a = mk('a')
    const b = mk('b')
    windy.addSpecies(a)
    calm.addSpecies(b)

    veg.update(windy, 1)
    veg.update(calm, 1)

    // Check pollination component directly via debug info saved on chunk
    const dbgWindy = (windy as any).__reproDebug?.get?.('silver_birch')
    const dbgCalm = (calm as any).__reproDebug?.get?.('silver_birch')
    expect(dbgWindy).toBeDefined()
    expect(dbgCalm).toBeDefined()
    expect(dbgWindy.pollinationSuccess).toBeGreaterThan(dbgCalm.pollinationSuccess)
  })
})
