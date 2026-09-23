import { describe, it, expect, beforeEach } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { SimulationEngine } from '@/simulation/SimulationEngine'

describe('Cross-chunk seed dispersal', () => {
  beforeEach(() => {
    RNGManager.initialize(123)
  })

  it('carries seeds into an emptied neighbouring chunk, where they germinate', () => {
    const engine = new SimulationEngine({
      worldWidth: 2,
      worldHeight: 1,
      chunkSize: 32,
      tickRate: 60,
      masterSeed: 42,
      maxActiveChunks: 2,
    })

    // Empty the right chunk, so any grass found there later must have come from the left one.
    const right = engine.getChunk(1, 0)!
    right.species.clear()
    ;(right as any).seedBank = []
    expect(Array.from(engine.getChunk(0, 0)!.species.values()).some(s => s.speciesId === 'common_grass')).toBe(true)

    engine.advance(90)

    expect(Array.from(engine.getChunk(1, 0)!.species.values()).some(s => s.speciesId === 'common_grass')).toBe(true)
  })
})
