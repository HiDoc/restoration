import { describe, it, expect, beforeEach } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { SimulationEngine } from '@/simulation/SimulationEngine'

describe('SimulationEngine chunk diffusion', () => {
  beforeEach(() => RNGManager.initialize(21))

  it('diffuses moisture from wet to dry neighbor', () => {
    const engine = new SimulationEngine({
      worldWidth: 2,
      worldHeight: 1,
      chunkSize: 32,
      tickRate: 60,
      masterSeed: 21,
      maxActiveChunks: 2,
    })
    engine.activateAllChunks()
    const left = engine.getChunk(0, 0)!
    const right = engine.getChunk(1, 0)!

    left.biomeState.moisture = 0.2
    right.biomeState.moisture = 0.8

    engine.update()

    expect(left.biomeState.moisture).toBeGreaterThan(0.2)
    expect(right.biomeState.moisture).toBeLessThan(0.8)
  })
})

