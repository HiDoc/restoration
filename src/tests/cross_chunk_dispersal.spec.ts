import { describe, it, expect, beforeEach } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { SimulationEngine } from '@/simulation/SimulationEngine'
import { PhenologyStage } from '@/simulation/WorldChunk'

describe('Cross-chunk seed dispersal', () => {
  beforeEach(() => {
    RNGManager.initialize(123)
  })

  it.each([42, 7, 99])('carries clover seed into an emptied neighbouring chunk, where it germinates (seed %i)', masterSeed => {
    const engine = new SimulationEngine({
      worldWidth: 2,
      worldHeight: 1,
      chunkSize: 32,
      tickRate: 60,
      masterSeed,
      maxActiveChunks: 2,
    })

    // Empty the right chunk, so any clover found there later must have come from the left one.
    const right = engine.getChunk(1, 0)!
    right.species.clear()
    ;(right as any).seedBank = []
    // A patch of flowering-age White Clover on the left chunk's edge.
    const left = engine.getChunk(0, 0)!
    for (let i = 0; i < 8; i++) {
      left.addSpecies({
        id: `clover_${i}`, speciesId: 'white_clover', x: 0.9, y: 0.1 + i * 0.1, biomass: 0.3, age: 400,
        phenologyStage: PhenologyStage.VEGETATIVE, health: 0.9, reproductiveOutput: 0, reproductiveUrge: 0, lastReproductionAttempt: 0,
      } as any)
    }

    engine.advance(360)

    expect(Array.from(engine.getChunk(1, 0)!.species.values()).some(s => s.speciesId === 'white_clover')).toBe(true)
  })
})
