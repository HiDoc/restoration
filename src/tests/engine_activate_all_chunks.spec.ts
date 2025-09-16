import { describe, it, expect, beforeEach } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { SimulationEngine } from '@/simulation/SimulationEngine'

describe('SimulationEngine.activateAllChunks', () => {
  beforeEach(() => RNGManager.initialize(1))

  it('activates every chunk in the world', () => {
    const engine = new SimulationEngine({
      worldWidth: 3,
      worldHeight: 2,
      chunkSize: 32,
      tickRate: 60,
      masterSeed: 7,
      maxActiveChunks: 6,
    })
    engine.activateAllChunks()
    expect(engine.getActiveChunkIds().size).toBe(3 * 2)
  })
})

