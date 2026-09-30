import { describe, it, expect, beforeEach } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { SimulationEngine } from '@/simulation/SimulationEngine'

describe('Center seeding in small world', () => {
  beforeEach(() => RNGManager.initialize(77))

  it('1x1 world still gets initial center seeds', () => {
    const engine = new SimulationEngine({
      worldWidth: 1,
      worldHeight: 1,
      chunkSize: 32,
      tickRate: 60,
      masterSeed: 9,
      maxActiveChunks: 1,
      seasonLengthTicks: 5,
    })
    const c = engine.getChunk(0,0)!
    expect(((c as any).seedBank as any[]).length).toBeGreaterThan(0)

  })
})

