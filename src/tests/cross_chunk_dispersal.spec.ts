import { describe, it, expect, beforeEach } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { SimulationEngine } from '@/simulation/SimulationEngine'
import { VegetationSystem } from '@/simulation/VegetationSystem'
import { PhenologyStage } from '@/simulation/WorldChunk'

describe('Cross-chunk seed dispersal', () => {
  beforeEach(() => {
    RNGManager.initialize(123)
  })

  it('disperses seeds from one chunk into an adjacent chunk and germinates', () => {
    const engine = new SimulationEngine({
      worldWidth: 2,
      worldHeight: 1,
      chunkSize: 32,
      tickRate: 60,
      masterSeed: 42,
      maxActiveChunks: 2,
    })

    const vegetation = new VegetationSystem(engine)

    const left = engine.getChunk(0, 0)!
    const right = engine.getChunk(1, 0)!
    expect(left).toBeDefined()
    expect(right).toBeDefined()

    // Place a fruiting common_grass near the right edge of the left chunk
    const plantId = 'test_grass_edge'
    left.addSpecies({
      id: plantId,
      speciesId: 'common_grass',
      x: 0.99, // near boundary to increase cross-boundary chance
      y: 0.5,
      biomass: 0.2,
      age: 800,
      phenologyStage: PhenologyStage.FRUITING,
      health: 0.9,
      reproductiveOutput: 90, // below reset threshold (0.8 * 120 = 96)
      reproductiveUrge: 0,
      lastReproductionAttempt: 0,
    } as any)

    // Perform one vegetation update on the left chunk to disperse seeds
    vegetation.update(left, 1)

    // Process seed banks and germination on the right chunk across several steps
    for (let i = 0; i < 20; i++) {
      vegetation.update(right, 1)
    }

    // Expect at least one common_grass individual in the right chunk
    const found = Array.from(right.species.values()).some((s) => s.speciesId === 'common_grass')
    expect(found).toBe(true)
  })
})

