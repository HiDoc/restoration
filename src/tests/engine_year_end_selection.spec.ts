import { describe, it, expect, beforeEach } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { SimulationEngine } from '@/simulation/SimulationEngine'
import { VegetationSystem } from '@/simulation/VegetationSystem'
import { PhenologyStage } from '@/simulation/WorldChunk'

describe('SimulationEngine year-end seed selection', () => {
  beforeEach(() => RNGManager.initialize(123))

  it('applies pending selection only after year rollover and new seedlings adopt master genome', () => {
    const engine = new SimulationEngine({
      worldWidth: 1,
      worldHeight: 1,
      chunkSize: 32,
      tickRate: 60,
      masterSeed: 42,
      maxActiveChunks: 1,
      seasonLengthTicks: 5, // year = 20 days
    })
    engine.activateAllChunks()

    const veg = new VegetationSystem(engine)
    const chunk = engine.getChunk(0, 0)!

    // Create a parent with explicit genetics
    const parentId = 'parent_common_grass'
    const parent: any = {
      id: parentId,
      speciesId: 'common_grass',
      x: 0.5,
      y: 0.5,
      biomass: 0.3,
      age: 900,
      phenologyStage: PhenologyStage.FRUITING,
      health: 0.9,
      reproductiveOutput: 0,
      reproductiveUrge: 0,
      lastReproductionAttempt: 0,
      genetics: {
        traits: new Map([[
          'drought_tolerance', { id: 'drought_tolerance', name: 'Drought', value: 0.77, baseValue: 0.77, mutationRate: 0.05, variance: 0.3, dominance: 0.7, beneficial: true }
        ]]),
        generation: 2,
        mutations: ['m1'],
        adaptationScore: 0.7,
      },
    }
    chunk.addSpecies(parent)

    // Select seed for next year
    const ok = engine.selectSeedForNextYear('common_grass', parentId)
    expect(ok).toBe(true)
    // Not applied yet
    expect(engine.getMasterGenome('common_grass')).toBeUndefined()

    // Advance to just before year end (year=20 days); default 1 day/tick
    for (let i = 0; i < 19; i++) engine.update()
    expect(engine.getMasterGenome('common_grass')).toBeUndefined()

    // Cross the boundary
    engine.update()
    const master = engine.getMasterGenome('common_grass')!
    expect(master).toBeDefined()
    expect(master.generation).toBe(2)
    expect(master.traits.get('drought_tolerance')?.value).toBeCloseTo(0.77, 5)

    // After rollover, seeds in the center 3x3 area are replaced with the selected species,
    // and existing individuals in that area adopt the master genome.
    const centerChunks = [engine.getChunk(0, 0)!]
    centerChunks.forEach((c) => {
      const bank = (c as any).seedBank as any[]
      expect(bank.length).toBeGreaterThan(0)
      bank.forEach(s => expect(s.speciesId).toBe('common_grass'))
      // Existing individuals updated to master genome
      const anyGrass = Array.from(c.species.values()).find((s: any) => s.speciesId === 'common_grass') as any
      expect(anyGrass?.genetics?.traits.get('drought_tolerance')?.value).toBeCloseTo(0.77, 5)
    })

    // Let one seed germinate and verify the seedling adopts the master genome
    for (let i = 0; i < 5; i++) veg.update(chunk, 1)

    const child = Array.from(chunk.species.values()).find((s) => s.id !== parentId && s.speciesId === 'common_grass') as any
    expect(child).toBeDefined()
    expect(child.genetics).toBeDefined()
    const masterGenome = engine.getMasterGenome('common_grass')!
    expect(masterGenome).toBeDefined()
    const masterVal = masterGenome.traits.get('drought_tolerance')!.value
    expect(child.genetics.traits.get('drought_tolerance').value).toBeCloseTo(masterVal, 5)
  })
})
